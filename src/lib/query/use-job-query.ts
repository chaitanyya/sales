import { useQuery } from "@tanstack/react-query";
import { getJobsActive, getJobsRecent, getJobById } from "@/lib/tauri/commands";
import { queryKeys } from "./keys";
import { useAuthStore } from "@/lib/store/auth-store";

/**
 * Fetches all active (running/queued) jobs.
 * Updates via event-bridge when job-status-changed fires.
 */
export function useActiveJobs() {
  const clerkOrgId = useAuthStore((state) => state.getCurrentOrgId());
  return useQuery({
    queryKey: queryKeys.jobsActive(clerkOrgId),
    queryFn: () => getJobsActive(clerkOrgId),
    enabled: !!clerkOrgId,
  });
}

/**
 * Fetches recent jobs.
 * Updates via event-bridge when job-created/job-status-changed fires.
 */
export function useRecentJobs(limit: number = 10) {
  const clerkOrgId = useAuthStore((state) => state.getCurrentOrgId());
  return useQuery({
    queryKey: queryKeys.jobsRecent(clerkOrgId, limit),
    queryFn: () => getJobsRecent(limit, clerkOrgId),
    enabled: !!clerkOrgId,
  });
}

/**
 * Fetches a specific job by ID.
 * Updates via event-bridge when job-status-changed fires.
 */
export function useJob(jobId: string, enabled: boolean = true) {
  const clerkOrgId = useAuthStore((state) => state.getCurrentOrgId());
  return useQuery({
    queryKey: queryKeys.job(jobId, clerkOrgId),
    queryFn: () => getJobById(jobId, clerkOrgId),
    enabled: enabled && !!jobId && !!clerkOrgId,
  });
}
