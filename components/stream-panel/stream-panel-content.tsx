"use client";

import { memo } from "react";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { ClientLogEntry, LogEntryType } from "@/lib/types/claude";
import { cn } from "@/lib/utils";
import {
  IconSettings,
  IconLoader2,
  IconArrowRight,
  IconCircleX,
  IconWorld,
  IconClock,
  IconMessage,
  IconExternalLink,
} from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function StreamPanelContent() {
  const { tabs, activeTabId } = useStreamPanelStore();

  const activeTab = tabs.find((t) => t.jobId === activeTabId);

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No active stream
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
      {activeTab.logs.map((log) => (
        <ActivityEntry key={log.id} entry={log} />
      ))}
      {activeTab.status === "running" && (
        <div className="flex items-center gap-2 py-2 px-3 text-muted-foreground">
          <IconLoader2 className="h-3 w-3 animate-spin" />
          <span className="text-sm">Processing...</span>
        </div>
      )}
      <div ref={(el) => el?.scrollIntoView()} />
    </div>
  );
}

const ActivityEntry = memo(function ActivityEntry({ entry }: { entry: ClientLogEntry }) {
  if (entry.content === "") return null;

  const color = getLogColor(entry.type);
  const isAssistant = entry.type === "assistant";

  return (
    <div className="flex items-start gap-2 py-2 px-3 border-b border-dashed border-muted hover:bg-muted/50 transition-colors">
      <div
        className={cn(
          "w-4 h-4 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5",
          color
        )}
      >
        {getLogIcon(entry.type)}
      </div>

      <div className="flex-1 min-w-0 text-sm">
        {isAssistant ? (
          <div className="prose-terminal-compact max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
          </div>
        ) : (
          <>
            {entry.toolName && (
              <span className={cn("font-medium", color)}>[{entry.toolName}] </span>
            )}
            <span className="text-muted-foreground">{entry.content}</span>
          </>
        )}
      </div>

      <span className="text-[10px] text-muted-foreground/40 flex-shrink-0 tabular-nums">
        {formatTime(entry.timestamp)}
      </span>
    </div>
  );
});

function getLogIcon(type: LogEntryType) {
  const cls = "h-2.5 w-2.5";
  switch (type) {
    case "system":
      return <IconSettings className={cls} />;
    case "assistant":
      return <IconMessage className={cls} />;
    case "tool_use":
      return <IconArrowRight className={cls} />;
    case "error":
      return <IconCircleX className={cls} />;
    case "browser":
      return <IconWorld className={cls} />;
    case "progress":
      return <IconClock className={cn(cls, "animate-pulse")} />;
    case "redirect":
      return <IconExternalLink className={cls} />;
    default:
      return <div className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />;
  }
}

function getLogColor(type: LogEntryType) {
  switch (type) {
    case "system":
      return "text-yellow-500/70";
    case "assistant":
      return "text-foreground";
    case "tool_use":
      return "text-blue-500";
    case "tool_result":
      return "text-green-500/70";
    case "error":
      return "text-red-500";
    case "browser":
      return "text-cyan-500";
    case "progress":
      return "text-muted-foreground";
    case "redirect":
      return "text-orange-400";
    default:
      return "text-muted-foreground";
  }
}

function formatTime(date: Date | string) {
  // Handle dates that were serialized to strings in localStorage
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
