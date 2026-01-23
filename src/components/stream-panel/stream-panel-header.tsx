"use client";

import { useMemo } from "react";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { useStreamTabs } from "@/lib/hooks/use-stream-tabs";
import { useJob } from "@/lib/query/use-job-query";
import { StreamPanelTabs } from "./stream-panel-tabs";
import { useStreamSubscription } from "./use-stream-subscription";
import { IconChevronDown, IconChevronUp, IconPlayerStop } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export function StreamPanelHeader() {
  const toggle = useStreamPanelStore((s) => s.toggle);
  const isOpen = useStreamPanelStore((s) => s.isOpen);
  const activeTabId = useStreamPanelStore((s) => s.activeTabId);

  const { tabs } = useStreamTabs();
  const { killJob, closeTab } = useStreamSubscription();

  // Fetch active job details
  const { data: activeJob } = useJob(activeTabId ?? "", !!activeTabId);

  // Count running tabs
  const runningCount = useMemo(
    () => tabs.filter((t) => t.status === "running" || t.status === "queued").length,
    [tabs]
  );

  const handleCloseTab = async (jobId: string, isRunning: boolean) => {
    // Delete all job data when closing a tab
    await closeTab(jobId, isRunning);
  };

  const handleStopCurrent = async () => {
    if (!activeTabId) return;

    if (activeJob?.status === "running" || activeJob?.status === "queued") {
      await killJob(activeTabId);
    }
  };

  return (
    <div className="border-t border-white/10 bg-black flex items-center justify-between border-b border-white/5 h-9 shrink-0">
      <StreamPanelTabs onCloseTab={handleCloseTab} />

      <div className="flex items-center gap-2 px-2">
        {(activeJob?.status === "running" || activeJob?.status === "queued") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStopCurrent}
            className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <IconPlayerStop className="h-3 w-3 mr-1" />
            Stop
          </Button>
        )}

        {runningCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            {runningCount} running
          </span>
        )}

        <button
          onClick={toggle}
          className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {isOpen ? <IconChevronDown className="h-4 w-4" /> : <IconChevronUp className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
