import { useMemo } from "react";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { useShallow } from "zustand/react/shallow";
import { useJob } from "@/lib/query/use-job-query";
import type { ClientLogEntry } from "@/lib/types/claude";
import type { JobStatus } from "@/lib/tauri/types";

const EMPTY_LOGS: ClientLogEntry[] = [];

export interface ActiveTabLogsResult {
  logs: ClientLogEntry[];
  isRunning: boolean;
  status: JobStatus | null;
  isLoading: boolean;
}

/**
 * Hook for the active tab's logs.
 * Simply reads from Zustand store (populated by live streaming + hydration).
 */
export function useActiveTabLogs(): ActiveTabLogsResult {
  const { activeTabId, jobLogs, isHydrated } = useStreamPanelStore(
    useShallow((s) => ({
      activeTabId: s.activeTabId,
      jobLogs: s.jobLogs,
      isHydrated: s.isHydrated,
    }))
  );

  // Get job status
  const { data: job, isLoading: isJobLoading } = useJob(activeTabId ?? "", !!activeTabId);
  const isRunning = job?.status === "running" || job?.status === "queued";

  // Get logs from Zustand
  const logs = useMemo(
    () => (activeTabId ? (jobLogs.get(activeTabId) ?? EMPTY_LOGS) : EMPTY_LOGS),
    [activeTabId, jobLogs]
  );

  return {
    logs,
    isRunning,
    status: job?.status ?? null,
    isLoading: isJobLoading || !isHydrated,
  };
}
