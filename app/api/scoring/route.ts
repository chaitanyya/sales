import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";
import path from "path";
import fs from "fs";
import {
  getActiveScoringConfig,
  getLead,
  getPeopleForLead,
  getAllLeads,
  getUnscoredLeads,
  saveLeadScore,
} from "@/lib/db/queries";
import { ResearchService, ResearchServiceLive } from "@/lib/research/research-service";
import { ExitReason } from "@/lib/research/claude-effect";
import {
  initializeJob,
  setJobStatus,
  appendJobEntry,
  processClaudeOutput,
} from "@/lib/research/job-state";
import { badRequest, notFound, serverError, jsonSuccess } from "@/lib/api/responses";
import { buildScoringPrompt } from "@/lib/prompts";
import { parseScoringResult } from "@/lib/scoring/result-parser";
import { Effect } from "effect";

export { getJobOutput, getJobStatus, clearJobOutput } from "@/lib/research/job-state";

const scoringRequestSchema = z.object({
  leadId: z.number().int().positive().optional(),
  mode: z.enum(["single", "unscored", "all"]).default("single"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parseResult = scoringRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues[0]?.message || "Invalid request body";
      return badRequest(errorMessage);
    }

    const { leadId, mode } = parseResult.data;

    // Get active scoring config
    const config = await getActiveScoringConfig();
    if (!config) {
      return badRequest("No scoring configuration found. Please configure scoring criteria first.");
    }

    // Determine which leads to score
    let leadsToScore: { id: number; companyName: string }[] = [];

    if (mode === "single") {
      if (!leadId) {
        return badRequest("leadId is required for single mode");
      }
      const lead = await getLead(leadId);
      if (!lead) {
        return notFound("Lead not found");
      }
      leadsToScore = [{ id: lead.id, companyName: lead.companyName }];
    } else if (mode === "unscored") {
      const unscored = await getUnscoredLeads();
      leadsToScore = unscored.map((l) => ({ id: l.id, companyName: l.companyName }));
    } else if (mode === "all") {
      const all = await getAllLeads();
      leadsToScore = all.map((l) => ({ id: l.id, companyName: l.companyName }));
    }

    if (leadsToScore.length === 0) {
      return jsonSuccess({
        jobId: null,
        message: "No leads to score",
        count: 0,
      });
    }

    const jobId = randomUUID();

    initializeJob(jobId, `Starting scoring for ${leadsToScore.length} lead(s)...`);

    // Start scoring process in background
    processLeadsSequentially(jobId, leadsToScore, config);

    return jsonSuccess({
      jobId,
      count: leadsToScore.length,
      status: "started",
    });
  } catch (error) {
    console.error("Scoring error:", error);
    return serverError("Failed to start scoring");
  }
}

async function processLeadsSequentially(
  jobId: string,
  leads: { id: number; companyName: string }[],
  config: Awaited<ReturnType<typeof getActiveScoringConfig>>
) {
  if (!config) return;

  let completed = 0;
  let failed = 0;

  for (const leadInfo of leads) {
    try {
      appendJobEntry(jobId, {
        type: "info",
        content: `\n--- Scoring ${leadInfo.companyName} (${completed + failed + 1}/${leads.length}) ---`,
        timestamp: Date.now(),
      });

      await scoreSingleLead(jobId, leadInfo.id, config);
      completed++;

      appendJobEntry(jobId, {
        type: "info",
        content: `Completed scoring for ${leadInfo.companyName}`,
        timestamp: Date.now(),
      });
    } catch (error) {
      failed++;
      appendJobEntry(jobId, {
        type: "error",
        content: `Failed to score ${leadInfo.companyName}: ${error}`,
        timestamp: Date.now(),
      });
    }
  }

  appendJobEntry(jobId, {
    type: "info",
    content: `\n--- Scoring Complete ---\nCompleted: ${completed}\nFailed: ${failed}`,
    timestamp: Date.now(),
  });

  setJobStatus(jobId, completed === leads.length ? "completed" : "error");
  revalidatePath("/lead");
}

async function scoreSingleLead(
  parentJobId: string,
  leadId: number,
  config: Awaited<ReturnType<typeof getActiveScoringConfig>>
): Promise<void> {
  if (!config) throw new Error("No config");

  const lead = await getLead(leadId);
  if (!lead) throw new Error("Lead not found");

  const people = await getPeopleForLead(leadId);

  // Set up output directory
  const outputDir = path.join(process.cwd(), "public/data/scoring");
  const companySlug = lead.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const scoringDir = path.join(outputDir, `score_${leadId}_${companySlug}`);
  fs.mkdirSync(scoringDir, { recursive: true });

  const outputPath = path.join(scoringDir, "score.json");

  const prompt = buildScoringPrompt({ ...lead, people }, config, outputPath);

  // Use Effect-based ResearchService with Promise wrapper for sequential processing
  return new Promise<void>((resolve, reject) => {
    const program = Effect.gen(function* () {
      const service = yield* ResearchService;

      const result = yield* service.startResearch({
        prompt,
        workingDir: process.cwd(),
        timeoutMs: 5 * 60 * 1000, // 5 minute timeout for scoring
        onData: (data) => {
          // Forward output to parent job
          processClaudeOutput(parentJobId, data);
        },
        onExit: async (code: number, reason?: ExitReason) => {
          if (reason === "timeout") {
            reject(new Error("Scoring timed out"));
            return;
          }

          if (code !== 0) {
            reject(new Error(`Scoring process exited with code ${code}`));
            return;
          }

          // Parse the result
          try {
            const resultJson = fs.readFileSync(outputPath, "utf-8");
            const scoringResult = parseScoringResult(resultJson, config);

            // Save to database
            await saveLeadScore(leadId, config.id, scoringResult);

            // Clean up
            try {
              fs.rmSync(scoringDir, { recursive: true, force: true });
            } catch {
              // Ignore cleanup errors
            }

            revalidatePath(`/lead/${leadId}`);
            resolve();
          } catch (parseError) {
            reject(new Error(`Failed to parse scoring result: ${parseError}`));
          }
        },
      });

      return result;
    });

    Effect.runPromise(program.pipe(Effect.provide(ResearchServiceLive))).catch(reject);
  });
}
