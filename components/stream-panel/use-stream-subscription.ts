"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { StreamManager, StreamManagerCallbacks } from "@/lib/stream";
import { toast } from "sonner";

export function useStreamSubscription() {
  const router = useRouter();
  const {
    tabs,
    appendLogs,
    updateStatus,
    updateConnectionStatus,
    incrementLastEventIndex,
    getLastEventIndex,
    removeTab,
  } = useStreamPanelStore();

  // Initialize StreamManager with callbacks
  // We always update callbacks to ensure they reference current store functions
  useEffect(() => {
    const callbacks: StreamManagerCallbacks = {
      onLog: (jobId, log) => {
        appendLogs(jobId, [log]);
      },
      onComplete: (jobId) => {
        updateStatus(jobId, "completed");
        // Refresh server components to pick up the newly updated data
        router.refresh();
      },
      onError: (jobId, message) => {
        // Add error log entry
        appendLogs(jobId, [
          {
            id: `${Date.now()}-error`,
            type: "error",
            content: message,
            timestamp: new Date(),
          },
        ]);
        updateStatus(jobId, "error");
      },
      onStatusChange: (jobId, status) => {
        updateConnectionStatus(jobId, status);
      },
      getLastEventIndex: (jobId) => {
        return getLastEventIndex(jobId);
      },
      incrementLastEventIndex: (jobId) => {
        incrementLastEventIndex(jobId);
      },
    };

    StreamManager.init(callbacks);
    // No cleanup - StreamManager is a singleton that persists across renders
  }, [
    appendLogs,
    updateStatus,
    updateConnectionStatus,
    incrementLastEventIndex,
    getLastEventIndex,
    router,
  ]);

  // Subscribe/unsubscribe based on tab status
  useEffect(() => {
    const runningJobs = new Set(tabs.filter((t) => t.status === "running").map((t) => t.jobId));

    // Subscribe to new running jobs (StreamManager handles duplicates)
    for (const jobId of runningJobs) {
      StreamManager.subscribe(jobId);
    }

    // Unsubscribe from jobs that are no longer running
    // Get the list of active connections and unsubscribe those not in runningJobs
    const activeJobs = StreamManager.getActiveJobIds();
    for (const jobId of activeJobs) {
      if (!runningJobs.has(jobId)) {
        StreamManager.unsubscribe(jobId);
      }
    }
    // No cleanup function - StreamManager manages its own state
    // and we don't want Strict Mode to cause unsubscribe/resubscribe cycles
  }, [tabs]);

  const killJob = async (jobId: string) => {
    try {
      await fetch(`/api/research/${jobId}/kill`, { method: "POST" });
    } catch (error) {
      toast.error("Failed to stop job");
    }
    StreamManager.unsubscribe(jobId);
    removeTab(jobId);
  };

  return { killJob };
}
