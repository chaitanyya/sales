"use client";

import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { useStreamTabs, StreamTab } from "@/lib/hooks/use-stream-tabs";
import { cn } from "@/lib/utils";
import {
  IconX,
  IconLoader2,
  IconCircleCheck,
  IconCircleX,
  IconBuilding,
  IconUser,
  IconClock,
  IconMessages,
  IconChartBar,
} from "@tabler/icons-react";

interface StreamPanelTabsProps {
  onCloseTab: (jobId: string, isRunning: boolean) => void;
}

export function StreamPanelTabs({ onCloseTab }: StreamPanelTabsProps) {
  const setActiveTab = useStreamPanelStore((s) => s.setActiveTab);
  const activeTabId = useStreamPanelStore((s) => s.activeTabId);
  const { tabs } = useStreamTabs();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
      {tabs.map((tab) => (
        <TabItem
          key={tab.jobId}
          tab={tab}
          isActive={tab.jobId === activeTabId}
          onClick={() => setActiveTab(tab.jobId)}
          onClose={() =>
            onCloseTab(tab.jobId, tab.status === "running" || tab.status === "queued")
          }
        />
      ))}
    </div>
  );
}

interface TabItemProps {
  tab: StreamTab;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

function TabItem({ tab, isActive, onClick, onClose }: TabItemProps) {
  const isRunning = tab.status === "running" || tab.status === "queued";

  const getStatusIcon = () => {
    switch (tab.status) {
      case "running":
      case "queued":
        return <IconLoader2 className="h-3 w-3 animate-spin text-blue-400" />;
      case "completed":
        return <IconCircleCheck className="h-3 w-3 text-green-400" />;
      case "error":
        return <IconCircleX className="h-3 w-3 text-red-400" />;
      case "timeout":
        return <IconClock className="h-3 w-3 text-yellow-400" />;
      case "cancelled":
        return <IconCircleX className="h-3 w-3 text-orange-400" />;
      default:
        return null;
    }
  };

  const getTypeIcon = () => {
    switch (tab.type) {
      case "company":
        return IconBuilding;
      case "person":
        return IconUser;
      case "conversation":
        return IconMessages;
      case "scoring":
        return IconChartBar;
      default:
        return IconBuilding;
    }
  };

  const TypeIcon = getTypeIcon();

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex border-b-2 border-white/5 items-center gap-2 px-3 py-2 text-sm transition-colors whitespace-nowrap",
        isActive ? "bg-white/5 text-foreground border-white/20" : "text-muted-foreground"
      )}
    >
      <TypeIcon className="h-3.5 w-3.5 shrink-0" />
      <span className="max-w-[120px] truncate">{tab.label}</span>
      <div className="flex items-center gap-1">
        {getStatusIcon()}
        {isRunning && (
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" title="Running" />
        )}
      </div>
      <span
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="p-0.5 rounded bg-white/10 opacity-20 group-hover:opacity-100 transition-opacity"
      >
        <IconX className="h-3 w-3 font-bold text-white" />
      </span>
    </button>
  );
}
