import { NextRequest } from "next/server";
import { z } from "zod";
import { db, people, leads } from "@/db";
import { eq } from "drizzle-orm";
import { findEmail, verifyEmail, extractDomain } from "@/lib/hunter/client";
import { badRequest, notFound, serverError } from "@/lib/api/responses";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const enrichRequestSchema = z.object({
  personId: z.number().int().positive().optional(),
  leadId: z.number().int().positive().optional(),
  verifyEmails: z.boolean().default(true),
}).refine((data) => data.personId || data.leadId, {
  message: "Either personId or leadId must be provided",
});

interface EnrichmentResult {
  personId: number;
  name: string;
  email: string | null;
  score: number | null;
  verified: boolean | null;
  verificationStatus: string | null;
  error: string | null;
}

async function enrichPerson(
  person: { id: number; firstName: string; lastName: string; email: string | null },
  domain: string,
  verifyEmails: boolean
): Promise<EnrichmentResult> {
  const name = `${person.firstName} ${person.lastName}`;

  // Skip if already has an email
  if (person.email) {
    let verificationStatus: string | null = null;

    if (verifyEmails) {
      const verification = await verifyEmail(person.email);
      verificationStatus = verification?.status || null;
    }

    return {
      personId: person.id,
      name,
      email: person.email,
      score: 100,
      verified: verificationStatus === "valid",
      verificationStatus,
      error: null,
    };
  }

  // Find email using Hunter.io
  const result = await findEmail(domain, person.firstName, person.lastName);

  if (!result || !result.email) {
    return {
      personId: person.id,
      name,
      email: null,
      score: null,
      verified: null,
      verificationStatus: null,
      error: "Email not found",
    };
  }

  // Verify if requested
  let verificationStatus: string | null = result.verification?.status || null;
  if (verifyEmails && result.email && !result.verification) {
    const verification = await verifyEmail(result.email);
    verificationStatus = verification?.status || null;
  }

  // Update person with found email
  await db
    .update(people)
    .set({ email: result.email })
    .where(eq(people.id, person.id));

  return {
    personId: person.id,
    name,
    email: result.email,
    score: result.score,
    verified: verificationStatus === "valid",
    verificationStatus,
    error: null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parseResult = enrichRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues[0]?.message || "Invalid request";
      return badRequest(errorMessage);
    }

    const { personId, leadId, verifyEmails } = parseResult.data;

    // Enrich single person
    if (personId) {
      const [person] = await db
        .select()
        .from(people)
        .where(eq(people.id, personId))
        .limit(1);

      if (!person) {
        return notFound("Person not found");
      }

      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, person.leadId))
        .limit(1);

      if (!lead) {
        return notFound("Company not found");
      }

      const domain = extractDomain(lead.website);
      if (!domain) {
        return badRequest("Company has no website - cannot find email");
      }

      const result = await enrichPerson(person, domain, verifyEmails);

      revalidatePath(`/lead/${person.leadId}`);
      revalidatePath(`/people/${personId}`);

      return NextResponse.json({ results: [result] });
    }

    // Enrich all people for a lead
    if (leadId) {
      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      if (!lead) {
        return notFound("Company not found");
      }

      const domain = extractDomain(lead.website);
      if (!domain) {
        return badRequest("Company has no website - cannot find emails");
      }

      const leadPeople = await db
        .select()
        .from(people)
        .where(eq(people.leadId, leadId));

      if (leadPeople.length === 0) {
        return badRequest("No people found for this company. Run research first.");
      }

      const results: EnrichmentResult[] = [];

      for (const person of leadPeople) {
        // Add a small delay between requests to respect rate limits
        if (results.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        const result = await enrichPerson(person, domain, verifyEmails);
        results.push(result);
      }

      revalidatePath(`/lead/${leadId}`);

      return NextResponse.json({
        leadId,
        domain,
        totalPeople: leadPeople.length,
        enriched: results.filter((r) => r.email).length,
        results,
      });
    }

    return badRequest("Either personId or leadId must be provided");
  } catch (error) {
    console.error("Enrichment error:", error);
    return serverError("Failed to enrich");
  }
}
