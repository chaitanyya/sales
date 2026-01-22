import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { Effect } from "effect";
import { getPromptByType, getPersonRaw, getLead, updatePersonConversation } from "@/lib/db/queries";
import { ResearchService, runWithResearchService } from "@/lib/research/research-service";
import { ExitReason } from "@/lib/research/claude-effect";
import {
  initializeJob,
  setJobStatus,
  appendJobEntry,
  processClaudeOutput,
} from "@/lib/research/job-state";
import { badRequest, notFound, serverError, jsonSuccess } from "@/lib/api/responses";
import { buildConversationPrompt } from "@/lib/prompts";

// Re-export job state accessors for use by streaming routes
export { getJobOutput, getJobStatus, clearJobOutput } from "@/lib/research/job-state";

const conversationRequestSchema = z.object({
  personId: z.number().int().positive("personId must be a positive integer"),
});

async function handleConversationComplete(
  personId: number,
  outputDir: string,
  outputPath: string
): Promise<void> {
  let conversationTopics: string | null = null;

  try {
    conversationTopics = fs.readFileSync(outputPath, "utf-8");
  } catch {
    console.log("Conversation topics file not found");
  }

  await updatePersonConversation(personId, {
    conversationTopics: conversationTopics ?? undefined,
    conversationGeneratedAt: new Date(),
  });

  // Clean up temporary files
  try {
    fs.rmSync(outputDir, { recursive: true, force: true });
  } catch {
    console.log("Cleanup error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parseResult = conversationRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues[0]?.message || "Invalid request body";
      return badRequest(errorMessage);
    }

    const { personId } = parseResult.data;

    const person = await getPersonRaw(personId);
    if (!person) {
      return notFound("Person not found");
    }

    const lead = await getLead(person.leadId);
    if (!lead) {
      return notFound("Company not found for this person");
    }

    const [conversationTopicsPrompt, companyOverviewPrompt] = await Promise.all([
      getPromptByType("conversation_topics"),
      getPromptByType("company_overview"),
    ]);

    if (!conversationTopicsPrompt) {
      return badRequest(
        "No conversation topics prompt configured. Please set a prompt in the Prompt settings."
      );
    }

    // Set up output directory
    const outputDir = path.join(process.cwd(), "public/data/conversation");
    const personSlug = `${person.firstName}_${person.lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    const conversationDirName = `conversation_${personId}_${personSlug}`;
    const conversationDir = path.join(outputDir, conversationDirName);
    fs.mkdirSync(conversationDir, { recursive: true });

    const outputPath = path.join(conversationDir, "conversation_topics.md");

    const fullPrompt = buildConversationPrompt(
      conversationTopicsPrompt.content,
      person,
      lead,
      outputPath,
      companyOverviewPrompt?.content
    );

    const fullName = `${person.firstName} ${person.lastName}`;

    // Generate jobId first so callbacks can use it immediately
    const jobId = randomUUID();

    // Initialize job state before starting
    initializeJob(jobId, `Generating conversation topics for ${fullName}...`);

    // Use Effect-based ResearchService
    const program = Effect.gen(function* () {
      const service = yield* ResearchService;

      const result = yield* service.startResearch({
        jobId,
        prompt: fullPrompt,
        workingDir: process.cwd(),
        timeoutMs: 10 * 60 * 1000, // 10 minutes
        onData: (data) => processClaudeOutput(jobId, data),
        onExit: async (code: number, reason?: ExitReason) => {
          if (reason === "timeout") {
            setJobStatus(jobId, "timeout");
            appendJobEntry(jobId, {
              type: "error",
              content: "Generation timed out after 10 minutes",
              timestamp: Date.now(),
            });
          } else if (code === 0) {
            setJobStatus(jobId, "completed");
            await handleConversationComplete(personId, conversationDir, outputPath);
          } else {
            setJobStatus(jobId, "error");
          }

          revalidatePath(`/people/${personId}`);
        },
      });

      return result;
    });

    try {
      const result = await runWithResearchService(program);

      return jsonSuccess({
        jobId,
        personId,
        status: result.status,
      });
    } catch (error) {
      const err = error as { _tag?: string; message?: string };
      if (err._tag === "QueueTimeoutError") {
        return serverError("Server busy - queue timeout. Please try again later.");
      }
      if (err._tag === "ClaudeNotFoundError") {
        return serverError("Claude CLI not found. Please check server configuration.");
      }
      if (err._tag === "ClaudeSpawnError") {
        return serverError("Failed to start generation process.");
      }
      console.error("Conversation generation error:", error);
      return serverError("Failed to start conversation generation");
    }
  } catch (error) {
    console.error("Conversation error:", error);
    return serverError("Failed to start conversation generation");
  }
}
