import { cache } from "react";
import { db, leads, prompts, people, scoringConfig, leadScores } from "@/db";
import { eq, asc, desc, sql, isNotNull } from "drizzle-orm";
import { NewPerson, NewScoringConfig } from "@/db/schema";
import type { ParsedScoringConfig, ParsedLeadScore, ScoringTier } from "@/lib/types/scoring";
import { groupByStatus, getStatusCounts, groupByLeadUserStatus, groupByPersonUserStatus } from "./status-utils";

/**
 * Get a single lead by ID
 * Uses React's cache() to deduplicate requests within the same render
 */
export const getLead = cache(async (id: number) => {
  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return lead ?? null;
});

/**
 * Get all leads ordered by company name
 */
export const getAllLeads = cache(async () => {
  return db.select().from(leads).orderBy(asc(leads.companyName));
});

/**
 * Get previous and next leads for navigation
 */
export const getAdjacentLeads = cache(async (currentId: number) => {
  const allLeads = await db.select({ id: leads.id }).from(leads).orderBy(asc(leads.companyName));

  const currentIndex = allLeads.findIndex((l) => l.id === currentId);
  const prevLead = currentIndex > 0 ? allLeads[currentIndex - 1] : null;
  const nextLead = currentIndex < allLeads.length - 1 ? allLeads[currentIndex + 1] : null;

  return {
    prevLead,
    nextLead,
    currentIndex: currentIndex + 1,
    total: allLeads.length,
  };
});

/**
 * Get leads grouped by status
 */
export const getLeadsGroupedByStatus = cache(async () => {
  const allLeads = await getAllLeads();
  const groupedLeads = groupByStatus(allLeads, (lead) => lead.researchStatus);

  return {
    allLeads,
    groupedLeads,
    counts: getStatusCounts(groupedLeads),
  };
});

/**
 * Get the current prompt (most recent one) - defaults to company type
 */
export const getPrompt = cache(async () => {
  const [prompt] = await db
    .select()
    .from(prompts)
    .where(eq(prompts.type, "company"))
    .orderBy(desc(prompts.id))
    .limit(1);
  return prompt ?? null;
});

/**
 * Get prompt by type (company, person, company_overview, or conversation_topics)
 */
export const getPromptByType = cache(async (type: "company" | "person" | "company_overview" | "conversation_topics") => {
  const [prompt] = await db
    .select()
    .from(prompts)
    .where(eq(prompts.type, type))
    .orderBy(desc(prompts.id))
    .limit(1);
  return prompt ?? null;
});

/**
 * Save or update the prompt
 */
export async function savePrompt(content: string) {
  const existing = await getPrompt();

  if (existing) {
    await db
      .update(prompts)
      .set({ content, updatedAt: new Date() })
      .where(eq(prompts.id, existing.id));
    return existing.id;
  } else {
    const [result] = await db
      .insert(prompts)
      .values({ content, type: "company" })
      .returning({ id: prompts.id });
    return result.id;
  }
}

/**
 * Save or update prompt by type
 */
export async function savePromptByType(type: "company" | "person" | "company_overview" | "conversation_topics", content: string) {
  const existing = await getPromptByType(type);

  if (existing) {
    await db
      .update(prompts)
      .set({ content, updatedAt: new Date() })
      .where(eq(prompts.id, existing.id));
    return existing.id;
  } else {
    const [result] = await db
      .insert(prompts)
      .values({ content, type })
      .returning({ id: prompts.id });
    return result.id;
  }
}

/**
 * Get all people for a lead
 */
export const getPeopleForLead = cache(async (leadId: number) => {
  return db
    .select()
    .from(people)
    .where(eq(people.leadId, leadId))
    .orderBy(asc(people.lastName), asc(people.firstName));
});

/**
 * Get all people with their company info, grouped by status
 */
export const getPeopleGroupedByStatus = cache(async () => {
  const allPeople = await db
    .select({
      id: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      title: people.title,
      email: people.email,
      linkedinUrl: people.linkedinUrl,
      leadId: people.leadId,
      companyName: leads.companyName,
      researchStatus: leads.researchStatus,
    })
    .from(people)
    .innerJoin(leads, eq(people.leadId, leads.id))
    .orderBy(asc(people.lastName), asc(people.firstName));

  const groupedPeople = groupByStatus(allPeople, (person) => person.researchStatus);

  return {
    allPeople,
    groupedPeople,
  };
});

/**
 * Delete all people for a lead (used before re-importing)
 */
export async function deletePeopleForLead(leadId: number) {
  await db.delete(people).where(eq(people.leadId, leadId));
}

/**
 * Insert multiple people for a lead
 */
export async function insertPeopleForLead(
  leadId: number,
  peopleData: Omit<NewPerson, "id" | "leadId" | "createdAt">[]
) {
  if (peopleData.length === 0) return;

  const toInsert = peopleData.map((p) => ({
    ...p,
    leadId,
  }));

  await db.insert(people).values(toInsert);
}

/**
 * Get a single person by ID (raw, without company join)
 */
export const getPersonRaw = cache(async (id: number) => {
  const [person] = await db.select().from(people).where(eq(people.id, id)).limit(1);
  return person ?? null;
});

/**
 * Get a single person by ID with company info
 */
export const getPerson = cache(async (id: number) => {
  const [person] = await db
    .select({
      id: people.id,
      leadId: people.leadId,
      firstName: people.firstName,
      lastName: people.lastName,
      email: people.email,
      title: people.title,
      managementLevel: people.managementLevel,
      linkedinUrl: people.linkedinUrl,
      yearJoined: people.yearJoined,
      personProfile: people.personProfile,
      researchStatus: people.researchStatus,
      researchedAt: people.researchedAt,
      userStatus: people.userStatus,
      conversationTopics: people.conversationTopics,
      conversationGeneratedAt: people.conversationGeneratedAt,
      createdAt: people.createdAt,
      // Company info
      companyName: leads.companyName,
      companyWebsite: leads.website,
      companyIndustry: leads.industry,
    })
    .from(people)
    .innerJoin(leads, eq(people.leadId, leads.id))
    .where(eq(people.id, id))
    .limit(1);
  return person ?? null;
});

/**
 * Get all people ordered by name
 */
export const getAllPeople = cache(async () => {
  return db
    .select({
      id: people.id,
      leadId: people.leadId,
      firstName: people.firstName,
      lastName: people.lastName,
      email: people.email,
      title: people.title,
      linkedinUrl: people.linkedinUrl,
      researchStatus: people.researchStatus,
      companyName: leads.companyName,
    })
    .from(people)
    .innerJoin(leads, eq(people.leadId, leads.id))
    .orderBy(asc(people.lastName), asc(people.firstName));
});

/**
 * Get previous and next people for navigation
 */
export const getAdjacentPeople = cache(async (currentId: number) => {
  const allPeopleList = await db
    .select({ id: people.id })
    .from(people)
    .orderBy(asc(people.lastName), asc(people.firstName));

  const currentIndex = allPeopleList.findIndex((p) => p.id === currentId);
  const prevPerson = currentIndex > 0 ? allPeopleList[currentIndex - 1] : null;
  const nextPerson =
    currentIndex < allPeopleList.length - 1 ? allPeopleList[currentIndex + 1] : null;

  return {
    prevPerson,
    nextPerson,
    currentIndex: currentIndex + 1,
    total: allPeopleList.length,
  };
});

/**
 * Get all people grouped by their own research status
 */
export const getPeopleGroupedByOwnStatus = cache(async () => {
  const allPeople = await getAllPeople();
  const groupedPeople = groupByStatus(allPeople, (person) => person.researchStatus);

  return {
    allPeople,
    groupedPeople,
    counts: getStatusCounts(groupedPeople),
  };
});

/**
 * Get all people grouped by their user status
 */
export const getPeopleGroupedByUserStatus = cache(async () => {
  const allPeople = await db
    .select({
      id: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      title: people.title,
      email: people.email,
      linkedinUrl: people.linkedinUrl,
      leadId: people.leadId,
      companyName: leads.companyName,
      researchStatus: people.researchStatus,
      userStatus: people.userStatus,
    })
    .from(people)
    .innerJoin(leads, eq(people.leadId, leads.id))
    .orderBy(asc(people.lastName), asc(people.firstName));

  const groupedPeople = groupByPersonUserStatus(allPeople, (person) => person.userStatus);

  return {
    allPeople,
    groupedPeople,
  };
});

/**
 * Update person research status and profile
 */
export async function updatePersonResearch(
  personId: number,
  data: {
    personProfile?: string;
    researchStatus?: "pending" | "in_progress" | "completed" | "failed";
    researchedAt?: Date;
  }
) {
  await db.update(people).set(data).where(eq(people.id, personId));
}

/**
 * Update person conversation topics
 */
export async function updatePersonConversation(
  personId: number,
  data: {
    conversationTopics?: string;
    conversationGeneratedAt?: Date;
  }
) {
  await db.update(people).set(data).where(eq(people.id, personId));
}

// ============================================
// Scoring Configuration Queries
// ============================================

/**
 * Get the active scoring configuration
 */
export const getActiveScoringConfig = cache(async (): Promise<ParsedScoringConfig | null> => {
  const [config] = await db
    .select()
    .from(scoringConfig)
    .where(eq(scoringConfig.isActive, true))
    .orderBy(desc(scoringConfig.id))
    .limit(1);

  if (!config) return null;

  return {
    ...config,
    requiredCharacteristics: JSON.parse(config.requiredCharacteristics),
    demandSignifiers: JSON.parse(config.demandSignifiers),
  };
});

/**
 * Get scoring configuration by ID
 */
export const getScoringConfig = cache(async (id: number): Promise<ParsedScoringConfig | null> => {
  const [config] = await db.select().from(scoringConfig).where(eq(scoringConfig.id, id)).limit(1);

  if (!config) return null;

  return {
    ...config,
    requiredCharacteristics: JSON.parse(config.requiredCharacteristics),
    demandSignifiers: JSON.parse(config.demandSignifiers),
  };
});

/**
 * Save or update scoring configuration
 */
export async function saveScoringConfig(
  config: Omit<NewScoringConfig, "id" | "createdAt" | "updatedAt"> & { id?: number }
) {
  if (config.id) {
    await db
      .update(scoringConfig)
      .set({
        ...config,
        updatedAt: new Date(),
      })
      .where(eq(scoringConfig.id, config.id));
    return config.id;
  } else {
    // Deactivate all existing configs
    await db.update(scoringConfig).set({ isActive: false });

    const [result] = await db
      .insert(scoringConfig)
      .values({
        ...config,
        isActive: true,
      })
      .returning({ id: scoringConfig.id });
    return result.id;
  }
}

// ============================================
// Lead Score Queries
// ============================================

/**
 * Get score for a single lead
 */
export const getLeadScore = cache(async (leadId: number): Promise<ParsedLeadScore | null> => {
  const [score] = await db
    .select()
    .from(leadScores)
    .where(eq(leadScores.leadId, leadId))
    .orderBy(desc(leadScores.id))
    .limit(1);

  if (!score) return null;

  return {
    ...score,
    requirementResults: JSON.parse(score.requirementResults),
    scoreBreakdown: JSON.parse(score.scoreBreakdown),
  };
});

/**
 * Get all leads with their scores
 */
export const getLeadsWithScores = cache(async () => {
  const allLeads = await getAllLeads();
  const scores = await db.select().from(leadScores);

  // Create a map of leadId to most recent score
  const scoreMap = new Map<number, ParsedLeadScore>();
  for (const score of scores) {
    const existing = scoreMap.get(score.leadId);
    if (!existing || score.id > existing.id) {
      scoreMap.set(score.leadId, {
        ...score,
        requirementResults: JSON.parse(score.requirementResults),
        scoreBreakdown: JSON.parse(score.scoreBreakdown),
      });
    }
  }

  return allLeads.map((lead) => ({
    ...lead,
    score: scoreMap.get(lead.id) || null,
  }));
});

/**
 * Get leads grouped by status with scores
 */
export const getLeadsGroupedByStatusWithScores = cache(async () => {
  const leadsWithScores = await getLeadsWithScores();
  const groupedLeads = groupByStatus(leadsWithScores, (lead) => lead.researchStatus);

  // Count by tier
  const tierCounts = {
    hot: 0,
    warm: 0,
    nurture: 0,
    disqualified: 0,
    unscored: 0,
  };

  for (const lead of leadsWithScores) {
    if (lead.score) {
      tierCounts[lead.score.tier]++;
    } else {
      tierCounts.unscored++;
    }
  }

  return {
    allLeads: leadsWithScores,
    groupedLeads,
    counts: getStatusCounts(groupedLeads),
    tierCounts,
  };
});

/**
 * Get leads grouped by user status with scores
 */
export const getLeadsGroupedByUserStatusWithScores = cache(async () => {
  const leadsWithScores = await getLeadsWithScores();
  const groupedLeads = groupByLeadUserStatus(leadsWithScores, (lead) => lead.userStatus);

  // Count by tier
  const tierCounts = {
    hot: 0,
    warm: 0,
    nurture: 0,
    disqualified: 0,
    unscored: 0,
  };

  for (const lead of leadsWithScores) {
    if (lead.score) {
      tierCounts[lead.score.tier]++;
    } else {
      tierCounts.unscored++;
    }
  }

  return {
    allLeads: leadsWithScores,
    groupedLeads,
    tierCounts,
  };
});

/**
 * Get unscored leads (leads that have never been scored)
 */
export const getUnscoredLeads = cache(async () => {
  const allLeads = await getAllLeads();
  const scoredLeadIds = await db.select({ leadId: leadScores.leadId }).from(leadScores);

  const scoredIds = new Set(scoredLeadIds.map((s) => s.leadId));
  return allLeads.filter((lead) => !scoredIds.has(lead.id));
});

/**
 * Save a lead score
 */
export async function saveLeadScore(
  leadId: number,
  configId: number,
  result: {
    passesRequirements: boolean;
    requirementResults: unknown[];
    totalScore: number;
    scoreBreakdown: unknown[];
    tier: ScoringTier;
    scoringNotes?: string;
  }
) {
  // Delete existing scores for this lead
  await db.delete(leadScores).where(eq(leadScores.leadId, leadId));

  const [inserted] = await db
    .insert(leadScores)
    .values({
      leadId,
      configId,
      passesRequirements: result.passesRequirements,
      requirementResults: JSON.stringify(result.requirementResults),
      totalScore: result.totalScore,
      scoreBreakdown: JSON.stringify(result.scoreBreakdown),
      tier: result.tier,
      scoringNotes: result.scoringNotes || null,
      scoredAt: new Date(),
    })
    .returning({ id: leadScores.id });

  return inserted.id;
}

/**
 * Delete score for a lead
 */
export async function deleteLeadScore(leadId: number) {
  await db.delete(leadScores).where(eq(leadScores.leadId, leadId));
}

// ============================================
// Manual Entry Queries
// ============================================

/**
 * Insert a single lead
 */
export async function insertLead(data: {
  companyName: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
}) {
  const [inserted] = await db
    .insert(leads)
    .values({
      companyName: data.companyName,
      website: data.website || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
    })
    .returning({ id: leads.id });
  return inserted.id;
}

/**
 * Insert a single person
 */
export async function insertPerson(data: {
  firstName: string;
  lastName: string;
  email?: string;
  title?: string;
  leadId: number;
}) {
  const [inserted] = await db
    .insert(people)
    .values({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      title: data.title || null,
      leadId: data.leadId,
    })
    .returning({ id: people.id });
  return inserted.id;
}

// ============================================
// Onboarding Status Queries
// ============================================

export type OnboardingStatus = {
  hasLead: boolean;
  hasResearchedLead: boolean;
  hasScoredLead: boolean;
  hasResearchedPerson: boolean;
  hasConversationTopics: boolean;
};

/**
 * Derive onboarding completion status from existing data
 */
export const getOnboardingStatus = cache(async (): Promise<OnboardingStatus> => {
  const [leadCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads);

  const [researchedLead] = await db
    .select()
    .from(leads)
    .where(eq(leads.researchStatus, "completed"))
    .limit(1);

  const [scoredLead] = await db.select().from(leadScores).limit(1);

  const [researchedPerson] = await db
    .select()
    .from(people)
    .where(eq(people.researchStatus, "completed"))
    .limit(1);

  const [personWithTopics] = await db
    .select()
    .from(people)
    .where(isNotNull(people.conversationTopics))
    .limit(1);

  return {
    hasLead: leadCount.count > 0,
    hasResearchedLead: !!researchedLead,
    hasScoredLead: !!scoredLead,
    hasResearchedPerson: !!researchedPerson,
    hasConversationTopics: !!personWithTopics,
  };
});
