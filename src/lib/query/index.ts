// Query client
export { queryClient } from "./query-client";
export { queryKeys } from "./keys";

// Lead queries
export {
  useLeadsWithScores,
  useLead,
  useLeadScore,
  useLeadPeople,
  useAdjacentLeads,
  useLeadsForSelect,
} from "./use-leads-query";

// Lead mutations
export {
  useInsertLead,
  useUpdateLeadStatus,
  useDeleteLeads,
} from "./use-lead-mutations";

// People queries
export {
  usePeopleList,
  usePerson,
  useAdjacentPeople,
} from "./use-people-query";

// People mutations
export {
  useInsertPerson,
  useUpdatePersonStatus,
  useDeletePeople,
} from "./use-people-mutations";

// Onboarding queries
export { useOnboardingStatus } from "./use-onboarding-query";

// Job queries
export { useActiveJobs, useRecentJobs, useJob } from "./use-job-query";
