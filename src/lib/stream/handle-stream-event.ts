import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { parseStreamJsonEvent } from "@/lib/stream/stream-parser";
import type { StreamEvent } from "@/lib/tauri/types";
import type { ClientLogEntry } from "@/lib/types/claude";

/**
 * Handle a stream event from the Tauri Channel.
 * Inserts ALL events into Zustand. Parse what we can, show raw for the rest.
 */
export function handleStreamEvent(event: StreamEvent): void {
  const { jobId, content, timestamp } = event;

  if (!jobId || jobId === "pending") {
    return;
  }

  // Try to parse, fallback to raw
  const parsed = parseStreamJsonEvent(content);

  const entries: ClientLogEntry[] = parsed.length > 0
    ? parsed.map((entry, idx) => ({
        ...entry,
        id: `${jobId}-${timestamp}-${idx}`,
        timestamp: new Date(entry.timestamp ?? timestamp),
      }))
    : [{
        id: `${jobId}-${timestamp}-raw`,
        type: "info" as const,
        content: content,
        timestamp: new Date(timestamp),
      }];

  useStreamPanelStore.getState().appendLogs(jobId, entries);
}
