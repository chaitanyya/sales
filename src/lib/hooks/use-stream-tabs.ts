import { useMemo, useEffect } from "react";
import { useRecentJobs, useActiveJobs } from "@/lib/query/use-job-query";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { getJobLogs } from "@/lib/tauri/commands";
import { parseJobLogs } from "@/lib/stream/job-log-parser";
import type { StreamTabType } from "@/lib/store/stream-panel-store";
import type { Job, JobType, JobStatus } from "@/lib/tauri/types";
import type { ClientLogEntry } from "@/lib/types/claude";

// Tab representation for the stream panel UI
export interface StreamTab {
  jobId: string;
  label: string;
  type: StreamTabType;
  entityId: number;
  status: JobStatus;
  createdAt: number;
}

// Map backend JobType to UI StreamTabType
function mapJobTypeToTabType(jobType: JobType): StreamTabType {
  switch (jobType) {
    case "company_research":
      return "company";
    case "person_research":
      return "person";
    case "scoring":
      return "scoring";
    case "conversation":
      return "conversation";
    default:
      return "company";
  }
}

// Convert a Job to a StreamTab
function mapJobToTab(job: Job): StreamTab {
  return {
    jobId: job.id,
    label: job.entityLabel,
    type: mapJobTypeToTabType(job.jobType),
    entityId: job.entityId,
    status: job.status,
    createdAt: job.createdAt,
  };
}

/**
 * Hook that returns tabs for the stream panel and hydrates all job logs.
 * Tabs come directly from the database via TanStack Query.
 * Returns tabs sorted by creation time (oldest first).
 *
 * Real-time updates come via Channel streaming.
 * On hard refresh, logs are hydrated from the database.
 */
export function useStreamTabs(limit: number = 50) {
  const { data: jobs = [], isLoading, error } = useRecentJobs(limit);
  const isHydrated = useStreamPanelStore((s) => s.isHydrated);
  const hydrateAll = useStreamPanelStore((s) => s.hydrateAll);

  // Hydrate all job logs on mount (once)
  useEffect(() => {
    if (isHydrated || jobs.length === 0) return;

    const hydrateAllLogs = async () => {
      const allLogs = new Map<string, ClientLogEntry[]>();

      // Fetch logs for all jobs in parallel
      const results = await Promise.all(
        jobs.map(async (job) => {
          try {
            const logs = await getJobLogs(job.id);
            return { jobId: job.id, logs: parseJobLogs(logs) };
          } catch {
            return { jobId: job.id, logs: [] };
          }
        })
      );

      for (const { jobId, logs } of results) {
        if (logs.length > 0) {
          allLogs.set(jobId, logs);
        }
      }

      hydrateAll(allLogs);
    };

    hydrateAllLogs();
  }, [jobs, isHydrated, hydrateAll]);

  const tabs = useMemo(() => {
    return jobs.map(mapJobToTab).sort((a, b) => a.createdAt - b.createdAt);
  }, [jobs]);

  return {
    tabs,
    isLoading,
    error,
  };
}

/**
 * Hook to check if a specific entity has an active job (running/queued).
 * Uses TanStack Query for job data.
 */
export function useIsJobActive(entityId: number, type: StreamTabType): boolean {
  const { data: jobs = [] } = useActiveJobs();

  return useMemo(() => {
    return jobs.some((job) => {
      if (job.entityId !== entityId) return false;
      if (mapJobTypeToTabType(job.jobType) !== type) return false;
      return job.status === "running" || job.status === "queued";
    });
  }, [jobs, entityId, type]);
}
