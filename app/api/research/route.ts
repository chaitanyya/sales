import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db, leads, Lead, Person } from "@/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { Effect } from "effect";
import {
  getPromptByType,
  deletePeopleForLead,
  insertPeopleForLead,
  getPersonRaw,
  updatePersonResearch,
  getLead,
} from "@/lib/db/queries";
import {
  ResearchService,
  runWithResearchService,
} from "@/lib/research/research-service";
import { ExitReason } from "@/lib/research/claude-effect";
import {
  initializeJob,
  setJobStatus,
  appendJobEntry,
  processClaudeOutput,
} from "@/lib/research/job-state";
import { badRequest, notFound, serverError, jsonSuccess } from "@/lib/api/responses";

// Re-export job state accessors for use by other routes (e.g., SSE streaming)
export { getJobOutput, getJobStatus, clearJobOutput } from "@/lib/research/job-state";

const researchRequestSchema = z
  .object({
    leadId: z.number().int().positive("leadId must be a positive integer").optional(),
    personId: z.number().int().positive("personId must be a positive integer").optional(),
    customPrompt: z.string().optional(),
  })
  .refine((data) => data.leadId || data.personId, {
    message: "Either leadId or personId must be provided",
  });

function formatLeadContext(lead: Lead): string {
  return `CONTEXT - Company Information:
Company Name: ${lead.companyName}
Website: ${lead.website || "N/A"}
Industry: ${lead.industry || "N/A"}
Sub-Industry: ${lead.subIndustry || "N/A"}
Employees: ${lead.employees || "N/A"}
Employee Range: ${lead.employeeRange || "N/A"}
Revenue: ${lead.revenue || "N/A"}
Revenue Range: ${lead.revenueRange || "N/A"}
LinkedIn: ${lead.companyLinkedinUrl || "N/A"}
City: ${lead.city || "N/A"}
State: ${lead.state || "N/A"}
Country: ${lead.country || "N/A"}`;
}

function buildResearchPrompt(
  basePrompt: string,
  lead: Lead,
  outputPaths: { companyProfile: string; people: string }
): string {
  return `${formatLeadContext(lead)}

${basePrompt}

IMPORTANT: When you have completed your research, save the outputs to these files:
1. Company profile: ${outputPaths.companyProfile}
2. People: ${outputPaths.people}

For the people.json file, output a JSON array of objects with this structure:
[
  {
    "firstName": "First Name",
    "lastName": "Last Name",
    "title": "Job Title",
    "email": "email@company.com or null if unknown",
    "linkedinUrl": "https://linkedin.com/in/... or null if unknown",
    "yearJoined": 2020 or null if unknown
  }
]
Include key people at the company that you discovered during research.
`;
}

async function handleResearchComplete(
  leadId: number,
  leadDir: string,
  companyProfilePath: string,
  peoplePath: string
): Promise<void> {
  let companyProfile: string | null = null;

  try {
    companyProfile = fs.readFileSync(companyProfilePath, "utf-8");
  } catch {
    console.log("Company profile not found");
  }

  // Parse people.json and save to people table
  try {
    const peopleJson = fs.readFileSync(peoplePath, "utf-8");
    const peopleData = JSON.parse(peopleJson) as Array<{
      firstName: string;
      lastName: string;
      name?: string;
      title?: string;
      email?: string;
      linkedinUrl?: string;
      yearJoined?: number;
    }>;

    await deletePeopleForLead(leadId);
    await insertPeopleForLead(
      leadId,
      peopleData.map((p) => {
        let firstName = p.firstName;
        let lastName = p.lastName;
        if (!firstName && p.name) {
          const parts = p.name.split(" ");
          firstName = parts[0] || "";
          lastName = parts.slice(1).join(" ") || "";
        }
        return {
          firstName: firstName || "Unknown",
          lastName: lastName || "",
          title: p.title || null,
          email: p.email || null,
          linkedinUrl: p.linkedinUrl || null,
          yearJoined: p.yearJoined || null,
        };
      })
    );
  } catch (e) {
    console.log("People data not found or invalid:", e);
  }

  await db
    .update(leads)
    .set({
      researchStatus: "completed",
      researchedAt: new Date(),
      companyProfile,
    })
    .where(eq(leads.id, leadId));

  // Clean up temporary files
  try {
    fs.rmSync(leadDir, { recursive: true, force: true });
  } catch {
    console.log("Cleanup error");
  }
}

function formatPersonContext(person: Person, lead: Lead): string {
  return `CONTEXT - Person Information:
Name: ${person.firstName} ${person.lastName}
Title: ${person.title || "N/A"}
Email: ${person.email || "N/A"}
LinkedIn: ${person.linkedinUrl || "N/A"}
Management Level: ${person.managementLevel || "N/A"}
Year Joined: ${person.yearJoined || "N/A"}

${formatLeadContext(lead)}`;
}

function buildPersonResearchPrompt(
  basePrompt: string,
  person: Person,
  lead: Lead,
  outputPath: string
): string {
  return `${formatPersonContext(person, lead)}

${basePrompt}

IMPORTANT: When you have completed your research, save the person profile to this file:
${outputPath}

The file should be a markdown document containing the person's profile, background, experience, and any relevant information you discovered.
`;
}

async function handlePersonResearchComplete(
  personId: number,
  personDir: string,
  profilePath: string
): Promise<void> {
  let personProfile: string | null = null;

  try {
    personProfile = fs.readFileSync(profilePath, "utf-8");
  } catch {
    console.log("Person profile not found");
  }

  await updatePersonResearch(personId, {
    personProfile: personProfile ?? undefined,
    researchStatus: "completed",
    researchedAt: new Date(),
  });

  // Clean up temporary files
  try {
    fs.rmSync(personDir, { recursive: true, force: true });
  } catch {
    console.log("Cleanup error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parseResult = researchRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues[0]?.message || "Invalid request body";
      return badRequest(errorMessage);
    }

    const { leadId, personId, customPrompt } = parseResult.data;

    // Handle person research
    if (personId) {
      return handlePersonResearch(personId, customPrompt);
    }

    // Handle company research (leadId must be present due to schema validation)
    return handleCompanyResearch(leadId!, customPrompt);
  } catch (error) {
    console.error("Research error:", error);
    return serverError("Failed to start research");
  }
}

async function handleCompanyResearch(leadId: number, customPrompt?: string) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);

  if (!lead) {
    return notFound("Lead not found");
  }

  await db.update(leads).set({ researchStatus: "in_progress" }).where(eq(leads.id, leadId));

  const dbPrompt = await getPromptByType("company");
  if (!dbPrompt && !customPrompt) {
    return badRequest("No company prompt configured. Please set a prompt in the Prompt settings.");
  }

  // Set up output directory
  const outputDir = path.join(process.cwd(), "public/data/research");
  const companySlug = lead.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const leadSlug = `company_${leadId}_${companySlug}`;
  const leadDir = path.join(outputDir, leadSlug);
  fs.mkdirSync(leadDir, { recursive: true });

  const companyProfilePath = path.join(leadDir, "company_profile.md");
  const peoplePath = path.join(leadDir, "people.json");

  const fullPrompt = buildResearchPrompt(customPrompt || dbPrompt!.content, lead, {
    companyProfile: companyProfilePath,
    people: peoplePath,
  });

  // Generate jobId first so callbacks can use it immediately
  const jobId = randomUUID();

  // Initialize job state before starting research
  initializeJob(jobId, `Starting research for ${lead.companyName}...`);

  // Use Effect-based ResearchService
  const program = Effect.gen(function* () {
    const service = yield* ResearchService;

    const result = yield* service.startResearch({
      jobId, // Pass the pre-generated jobId
      prompt: fullPrompt,
      workingDir: process.cwd(),
      timeoutMs: 10 * 60 * 1000, // 10 minutes
      onData: (data) => processClaudeOutput(jobId, data),
      onExit: async (code: number, reason?: ExitReason) => {
        if (reason === "timeout") {
          setJobStatus(jobId, "timeout");
          appendJobEntry(jobId, {
            type: "error",
            content: "Research timed out after 10 minutes",
            timestamp: Date.now(),
          });
          await db.update(leads).set({ researchStatus: "failed" }).where(eq(leads.id, leadId));
        } else if (code === 0) {
          setJobStatus(jobId, "completed");
          await handleResearchComplete(leadId, leadDir, companyProfilePath, peoplePath);
        } else {
          setJobStatus(jobId, "error");
          await db.update(leads).set({ researchStatus: "failed" }).where(eq(leads.id, leadId));
        }

        revalidatePath("/");
        revalidatePath(`/lead/${leadId}`);
      },
    });

    return result;
  });

  try {
    const result = await runWithResearchService(program);

    return jsonSuccess({
      jobId, // Use pre-generated jobId
      leadId,
      status: result.status,
    });
  } catch (error) {
    // Handle typed Effect errors
    const err = error as { _tag?: string; message?: string };
    if (err._tag === "QueueTimeoutError") {
      await db.update(leads).set({ researchStatus: "failed" }).where(eq(leads.id, leadId));
      return serverError("Server busy - queue timeout. Please try again later.");
    }
    if (err._tag === "ClaudeNotFoundError") {
      await db.update(leads).set({ researchStatus: "failed" }).where(eq(leads.id, leadId));
      return serverError("Claude CLI not found. Please check server configuration.");
    }
    if (err._tag === "ClaudeSpawnError") {
      await db.update(leads).set({ researchStatus: "failed" }).where(eq(leads.id, leadId));
      return serverError("Failed to start research process.");
    }
    console.error("Research error:", error);
    await db.update(leads).set({ researchStatus: "failed" }).where(eq(leads.id, leadId));
    return serverError("Failed to start research");
  }
}

async function handlePersonResearch(personId: number, customPrompt?: string) {
  const person = await getPersonRaw(personId);

  if (!person) {
    return notFound("Person not found");
  }

  const lead = await getLead(person.leadId);
  if (!lead) {
    return notFound("Company not found for this person");
  }

  await updatePersonResearch(personId, { researchStatus: "in_progress" });

  const dbPrompt = await getPromptByType("person");
  if (!dbPrompt && !customPrompt) {
    return badRequest(
      "No person prompt configured. Please set a person prompt in the Prompt settings."
    );
  }

  // Set up output directory
  const outputDir = path.join(process.cwd(), "public/data/research");
  const personSlug = `${person.firstName}_${person.lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const personDirName = `person_${personId}_${personSlug}`;
  const personDir = path.join(outputDir, personDirName);
  fs.mkdirSync(personDir, { recursive: true });

  const profilePath = path.join(personDir, "person_profile.md");

  const fullPrompt = buildPersonResearchPrompt(
    customPrompt || dbPrompt!.content,
    person,
    lead,
    profilePath
  );

  const fullName = `${person.firstName} ${person.lastName}`;

  // Generate jobId first so callbacks can use it immediately
  const jobId = randomUUID();

  // Initialize job state before starting research
  initializeJob(jobId, `Starting research for ${fullName}...`);

  // Use Effect-based ResearchService
  const program = Effect.gen(function* () {
    const service = yield* ResearchService;

    const result = yield* service.startResearch({
      jobId, // Pass the pre-generated jobId
      prompt: fullPrompt,
      workingDir: process.cwd(),
      timeoutMs: 10 * 60 * 1000, // 10 minutes
      onData: (data) => processClaudeOutput(jobId, data),
      onExit: async (code: number, reason?: ExitReason) => {
        if (reason === "timeout") {
          setJobStatus(jobId, "timeout");
          appendJobEntry(jobId, {
            type: "error",
            content: "Research timed out after 10 minutes",
            timestamp: Date.now(),
          });
          await updatePersonResearch(personId, { researchStatus: "failed" });
        } else if (code === 0) {
          setJobStatus(jobId, "completed");
          await handlePersonResearchComplete(personId, personDir, profilePath);
        } else {
          setJobStatus(jobId, "error");
          await updatePersonResearch(personId, { researchStatus: "failed" });
        }

        revalidatePath("/people");
        revalidatePath(`/people/${personId}`);
        revalidatePath(`/lead/${person.leadId}`);
      },
    });

    return result;
  });

  try {
    const result = await runWithResearchService(program);

    return jsonSuccess({
      jobId, // Use pre-generated jobId
      personId,
      status: result.status,
    });
  } catch (error) {
    // Handle typed Effect errors
    const err = error as { _tag?: string; message?: string };
    if (err._tag === "QueueTimeoutError") {
      await updatePersonResearch(personId, { researchStatus: "failed" });
      return serverError("Server busy - queue timeout. Please try again later.");
    }
    if (err._tag === "ClaudeNotFoundError") {
      await updatePersonResearch(personId, { researchStatus: "failed" });
      return serverError("Claude CLI not found. Please check server configuration.");
    }
    if (err._tag === "ClaudeSpawnError") {
      await updatePersonResearch(personId, { researchStatus: "failed" });
      return serverError("Failed to start research process.");
    }
    console.error("Research error:", error);
    await updatePersonResearch(personId, { researchStatus: "failed" });
    return serverError("Failed to start research");
  }
}
