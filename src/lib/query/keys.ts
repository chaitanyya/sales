export const queryKeys = {
  // Leads
  leads: () => ["leads"] as const,
  leadsWithScores: () => [...queryKeys.leads(), "with-scores"] as const,
  lead: (id: number) => [...queryKeys.leads(), id] as const,
  leadScore: (id: number) => [...queryKeys.leads(), id, "score"] as const,
  leadPeople: (id: number) => [...queryKeys.leads(), id, "people"] as const,
  leadAdjacent: (id: number) => [...queryKeys.leads(), id, "adjacent"] as const,

  // People
  people: () => ["people"] as const,
  peopleList: () => [...queryKeys.people(), "list"] as const,
  person: (id: number) => [...queryKeys.people(), id] as const,
  personAdjacent: (id: number) => [...queryKeys.people(), id, "adjacent"] as const,

  // Jobs
  jobs: () => ["jobs"] as const,
  jobsActive: () => [...queryKeys.jobs(), "active"] as const,
  jobsRecent: (limit: number) => [...queryKeys.jobs(), "recent", limit] as const,
  job: (id: string) => [...queryKeys.jobs(), id] as const,

  // Onboarding
  onboarding: () => ["onboarding"] as const,
  onboardingStatus: () => [...queryKeys.onboarding(), "status"] as const,

  // Leads for select (used in dropdowns)
  leadsForSelect: () => [...queryKeys.leads(), "for-select"] as const,

  // Scoring config
  scoringConfig: () => ["scoring-config"] as const,

  // Prompts
  prompts: () => ["prompts"] as const,
};
