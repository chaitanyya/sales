export const queryKeys = {
  // Leads - all scoped by clerkOrgId to prevent cache pollution between orgs
  leads: (clerkOrgId: string | null) => ["leads", clerkOrgId] as const,
  leadsWithScores: (clerkOrgId: string | null) => [...queryKeys.leads(clerkOrgId), "with-scores"] as const,
  lead: (id: number, clerkOrgId: string | null) => [...queryKeys.leads(clerkOrgId), id] as const,
  leadScore: (id: number, clerkOrgId: string | null) => [...queryKeys.leads(clerkOrgId), id, "score"] as const,
  leadPeople: (id: number, clerkOrgId: string | null) => [...queryKeys.leads(clerkOrgId), id, "people"] as const,
  leadAdjacent: (id: number, clerkOrgId: string | null) => [...queryKeys.leads(clerkOrgId), id, "adjacent"] as const,

  // People - all scoped by clerkOrgId to prevent cache pollution between orgs
  people: (clerkOrgId: string | null) => ["people", clerkOrgId] as const,
  peopleList: (clerkOrgId: string | null) => [...queryKeys.people(clerkOrgId), "list"] as const,
  person: (id: number, clerkOrgId: string | null) => [...queryKeys.people(clerkOrgId), id] as const,
  personAdjacent: (id: number, clerkOrgId: string | null) => [...queryKeys.people(clerkOrgId), id, "adjacent"] as const,

  // Jobs - scoped by clerkOrgId to prevent cache pollution between orgs
  jobs: (clerkOrgId: string | null) => ["jobs", clerkOrgId] as const,
  jobsActive: (clerkOrgId: string | null) => [...queryKeys.jobs(clerkOrgId), "active"] as const,
  jobsRecent: (clerkOrgId: string | null, limit: number) => [...queryKeys.jobs(clerkOrgId), "recent", limit] as const,
  job: (id: string, clerkOrgId: string | null) => [...queryKeys.jobs(clerkOrgId), id] as const,

  // Onboarding - scoped by clerkOrgId
  onboarding: (clerkOrgId: string | null) => ["onboarding", clerkOrgId] as const,
  onboardingStatus: (clerkOrgId: string | null) => [...queryKeys.onboarding(clerkOrgId), "status"] as const,

  // Leads for select (used in dropdowns) - scoped by clerkOrgId
  leadsForSelect: (clerkOrgId: string | null) => [...queryKeys.leads(clerkOrgId), "for-select"] as const,

  // Scoring config - scoped by clerkOrgId
  scoringConfig: (clerkOrgId: string | null) => ["scoring-config", clerkOrgId] as const,

  // Prompts - scoped by clerkOrgId
  prompts: (clerkOrgId: string | null) => ["prompts", clerkOrgId] as const,
};
