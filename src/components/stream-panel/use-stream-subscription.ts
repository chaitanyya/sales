"use client";

import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { killJob as tauriKillJob, deleteJob as tauriDeleteJob } from "@/lib/tauri/commands";
import { queryClient } from "@/lib/query/query-client";
import { queryKeys } from "@/lib/query/keys";
import { toast } from "sonner";
import type { Job } from "@/lib/tauri/types";

export function useStreamSubscription() {
  const clearLogs = useStreamPanelStore((s) => s.clearLogs);
  const setActiveTab = useStreamPanelStore((s) => s.setActiveTab);
  const activeTabId = useStreamPanelStore((s) => s.activeTabId);

  // Kill a running job
  const killJob = async (jobId: string) => {
    try {
      await tauriKillJob(jobId);
      // Invalidate jobs query to reflect status change
      queryClient.invalidateQueries({ queryKey: queryKeys.jobsRecent(50) });
    } catch {
      toast.error("Failed to stop job");
    }
  };

  // Close tab and delete all job data from database
  const closeTab = async (jobId: string, isRunning: boolean) => {
    // If this is the active tab, select another tab before closing
    if (activeTabId === jobId) {
      // Get current jobs from query cache
      const jobs = queryClient.getQueryData<Job[]>(queryKeys.jobsRecent(50)) ?? [];
      // Sort by creation time (oldest first) to match tab order
      const sortedJobs = [...jobs].sort((a, b) => a.createdAt - b.createdAt);
      const currentIndex = sortedJobs.findIndex((j) => j.id === jobId);

      // Find next tab to select (prefer next, then previous)
      let nextTabId: string | null = null;
      if (sortedJobs.length > 1) {
        if (currentIndex < sortedJobs.length - 1) {
          // Select next tab
          nextTabId = sortedJobs[currentIndex + 1].id;
        } else if (currentIndex > 0) {
          // Select previous tab (we're closing the last one)
          nextTabId = sortedJobs[currentIndex - 1].id;
        }
      }
      setActiveTab(nextTabId);
    }

    // If running, kill first
    if (isRunning) {
      try {
        await tauriKillJob(jobId);
      } catch {
        // Continue anyway - we still want to delete
      }
    }

    // Delete from database
    try {
      await tauriDeleteJob(jobId);
    } catch (e) {
      console.error("Failed to delete job:", e);
    }

    // Clear logs from Zustand store
    clearLogs(jobId);

    // Invalidate jobs query so tab disappears
    queryClient.invalidateQueries({ queryKey: queryKeys.jobsRecent(50) });
  };

  return { killJob, closeTab };
}
