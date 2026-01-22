"use client";

import { useStreamPanelStore, StreamTab } from "@/lib/store/stream-panel-store";
import { useShallow } from "zustand/react/shallow";
import { ConnectionStatus } from "@/lib/stream";
import { cn } from "@/lib/utils";
import {
  IconX,
  IconLoader2,
  IconCircleCheck,
  IconCircleX,
  IconBuilding,
  IconUser,
  IconClock,
} from "@tabler/icons-react";

interface StreamPanelTabsProps {
  onCloseTab: (jobId: string, isRunning: boolean) => void;
}

export function StreamPanelTabs({ onCloseTab }: StreamPanelTabsProps) {
  // Use individual selector for action (stable reference)
  const setActiveTab = useStreamPanelStore((s) => s.setActiveTab);

  // Use shallow comparison for state that changes together
  const { tabs, activeTabId } = useStreamPanelStore(
    useShallow((s) => ({ tabs: s.tabs, activeTabId: s.activeTabId }))
  );

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
          onClose={() => onCloseTab(tab.jobId, tab.status === "running")}
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

function getConnectionStatusIndicator(status: ConnectionStatus) {
  switch (status) {
    case "connected":
      return <span className="h-1.5 w-1.5 rounded-full bg-green-400" title="Connected" />;
    case "connecting":
      return (
        <span
          className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"
          title="Connecting..."
        />
      );
    case "reconnecting":
      return (
        <span
          className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse"
          title="Reconnecting..."
        />
      );
    case "error":
      return <span className="h-1.5 w-1.5 rounded-full bg-red-400" title="Connection error" />;
    case "disconnected":
    case "idle":
    default:
      return null;
  }
}

function TabItem({ tab, isActive, onClick, onClose }: TabItemProps) {
  const getStatusIcon = () => {
    switch (tab.status) {
      case "running":
        return <IconLoader2 className="h-3 w-3 animate-spin text-blue-400" />;
      case "completed":
        return <IconCircleCheck className="h-3 w-3 text-green-400" />;
      case "error":
        return <IconCircleX className="h-3 w-3 text-red-400" />;
      case "timeout":
        return <IconClock className="h-3 w-3 text-yellow-400" />;
      default:
        return null;
    }
  };

  const TypeIcon = tab.type === "company" ? IconBuilding : IconUser;

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
        {tab.status === "running" && getConnectionStatusIndicator(tab.connectionStatus)}
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
