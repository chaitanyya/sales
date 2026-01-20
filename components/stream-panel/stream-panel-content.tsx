"use client";

import { useEffect, useRef, memo } from "react";
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
} from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function StreamPanelContent() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { tabs, activeTabId } = useStreamPanelStore();

  const activeTab = tabs.find((t) => t.jobId === activeTabId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeTab?.logs]);

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        No active stream
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 space-y-0">
      {activeTab.logs.map((log) => (
        <ActivityEntry key={log.id} entry={log} />
      ))}
      {activeTab.status === "running" && (
        <div className="flex items-center gap-2 py-1 px-3">
          <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
            <IconLoader2 className="h-3 w-3 text-muted-foreground animate-spin" />
          </div>
          <span className="text-sm text-muted-foreground">Processing...</span>
        </div>
      )}
    </div>
  );
}

const ActivityEntry = memo(function ActivityEntry({ entry }: { entry: ClientLogEntry }) {
  if (entry.type === "assistant") {
    return <AssistantEntry entry={entry} />;
  }

  const color = getLogColor(entry.type);

  if (entry.content === "") {
    return null;
  }

  return (
    <div className="group py-1 px-3 rounded-md hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0",
            color
          )}
        >
          {getLogIcon(entry.type)}
        </div>
        <span className="flex-1 text-sm truncate min-w-0">
          {entry.toolName && <span className="text-foreground">[{entry.toolName}] </span>}
          <span className="text-muted-foreground">{entry.content}</span>
        </span>
        <span className="text-xs text-muted-foreground/50 flex-shrink-0">
          {formatTime(entry.timestamp)}
        </span>
      </div>
    </div>
  );
});

// Special component for assistant messages with markdown rendering
const AssistantEntry = memo(function AssistantEntry({ entry }: { entry: ClientLogEntry }) {
  return (
    <div className="group py-2 px-3 rounded-md hover:bg-white/[0.02] transition-colors">
      <div className="flex gap-2">
        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-2">
          <IconMessage className="h-3 w-3 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="prose prose-sm prose-invert max-w-none text-sm
            prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-2
            prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
            prose-p:text-foreground/90 prose-p:my-1.5 prose-p:leading-relaxed
            prose-strong:text-foreground prose-strong:font-semibold
            prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-li:text-foreground/90
            prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
            prose-code:text-xs prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-white/5 prose-pre:text-xs prose-pre:p-2 prose-pre:rounded-md
            prose-blockquote:border-l-2 prose-blockquote:border-white/20 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-foreground/70
            prose-table:text-xs prose-th:text-foreground prose-td:text-foreground/80
          "
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
          </div>
          <span className="text-xs text-muted-foreground/50 mt-1 block">
            {formatTime(entry.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
});

function getLogIcon(type: LogEntryType) {
  switch (type) {
    case "system":
      return <IconSettings className="h-3 w-3" />;
    case "tool_use":
      return <IconArrowRight className="h-3 w-3" />;
    case "error":
      return <IconCircleX className="h-3 w-3" />;
    case "browser":
      return <IconWorld className="h-3 w-3" />;
    case "progress":
      return <IconClock className="h-3 w-3 animate-pulse" />;
    default:
      return <div className="h-3 w-3 rounded-full bg-current opacity-40" />;
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

