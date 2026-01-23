import type { JobLog } from "@/lib/tauri/types";
import type { ClientLogEntry } from "@/lib/types/claude";
import { parseStreamJsonEvent, parseRawOutput } from "./stream-parser";

/**
 * Parse a JobLog (from database) into ClientLogEntry array (for UI).
 * Handles both JSON and raw text formats.
 */
export function parseJobLog(log: JobLog): ClientLogEntry[] {
  const content = log.content;

  // Try parsing as JSON first (Claude stream-json format)
  if (content.startsWith("{")) {
    const entries = parseStreamJsonEvent(content);
    return entries.map((entry, idx) => ({
      ...entry,
      id: `${log.jobId}-${log.sequence}-${idx}`,
      timestamp: new Date(log.timestamp),
    }));
  }

  // Fall back to raw output parsing
  const entry = parseRawOutput(content);
  if (entry) {
    return [
      {
        ...entry,
        id: `${log.jobId}-${log.sequence}`,
        timestamp: new Date(log.timestamp),
      },
    ];
  }

  return [];
}

/**
 * Parse multiple JobLogs into a flat array of ClientLogEntries.
 */
export function parseJobLogs(logs: JobLog[]): ClientLogEntry[] {
  return logs.flatMap(parseJobLog);
}
