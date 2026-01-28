import { useQuery } from "@tanstack/react-query";
import { getJobsActive, getJobsRecent, getJobById } from "@/lib/tauri/commands";
import { queryKeys } from "./keys";

/**
 * Fetches all active (running/queued) jobs.
 * Updates via event-bridge when job-status-changed fires.
 */
export function useActiveJobs() {
  return useQuery({
    queryKey: queryKeys.jobsActive(),
    queryFn: () => getJobsActive(),
  });
}

/**
 * Fetches recent jobs.
 * Updates via event-bridge when job-created/job-status-changed fires.
 */
export function useRecentJobs(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.jobsRecent(limit),
    queryFn: () => getJobsRecent(limit),
  });
}

/**
 * Fetches a specific job by ID.
 * Updates via event-bridge when job-status-changed fires.
 */
export function useJob(jobId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.job(jobId),
    queryFn: () => getJobById(jobId),
    enabled: enabled && !!jobId,
  });
}
