"use client";

import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { StreamPanelTabs } from "./stream-panel-tabs";
import { useStreamSubscription } from "./use-stream-subscription";
import { IconChevronDown, IconChevronUp, IconPlayerStop } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export function StreamPanelHeader() {
  const { isOpen, tabs, activeTabId, toggle, removeTab, updateStatus } = useStreamPanelStore();
  const { killJob } = useStreamSubscription();

  const activeTab = tabs.find((t) => t.jobId === activeTabId);
  const hasRunningTabs = tabs.some((t) => t.status === "running");

  const handleCloseTab = async (jobId: string, isRunning: boolean) => {
    if (isRunning) {
      await killJob(jobId);
    } else {
      removeTab(jobId);
    }
  };

  const handleStopCurrent = async () => {
    if (activeTab && activeTab.status === "running") {
      await killJob(activeTab.jobId);
      updateStatus(activeTab.jobId, "error");
    }
  };

  return (
    <div className="border-t border-white/10 bg-black flex items-center justify-between border-b border-white/5 h-9 shrink-0">
      <StreamPanelTabs onCloseTab={handleCloseTab} />

      <div className="flex items-center gap-2 px-2">
        {activeTab?.status === "running" && (
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

        {hasRunningTabs && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            {tabs.filter((t) => t.status === "running").length} running
          </span>
        )}

        <button
          onClick={toggle}
          className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {isOpen ? (
            <IconChevronDown className="h-4 w-4" />
          ) : (
            <IconChevronUp className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
