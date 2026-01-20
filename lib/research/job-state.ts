import { LogEntry, JobStatus } from "@/lib/types/claude";
import { parseStreamJsonEvent, parseRawOutput } from "./stream-parser";

// Use globalThis to persist across HMR in development
const globalForResearch = globalThis as unknown as {
  outputBuffers: Map<string, LogEntry[]>;
  jobStatus: Map<string, JobStatus>;
  lineBuffers: Map<string, string>;
};

const outputBuffers = globalForResearch.outputBuffers ?? new Map<string, LogEntry[]>();
const jobStatus = globalForResearch.jobStatus ?? new Map<string, JobStatus>();
const lineBuffers = globalForResearch.lineBuffers ?? new Map<string, string>();

if (process.env.NODE_ENV !== "production") {
  globalForResearch.outputBuffers = outputBuffers;
  globalForResearch.jobStatus = jobStatus;
  globalForResearch.lineBuffers = lineBuffers;
}

export function getJobOutput(jobId: string): LogEntry[] {
  return outputBuffers.get(jobId) || [];
}

export function getJobStatus(jobId: string): JobStatus | undefined {
  return jobStatus.get(jobId);
}

export function setJobStatus(jobId: string, status: JobStatus): void {
  jobStatus.set(jobId, status);
}

export function clearJobOutput(jobId: string): void {
  outputBuffers.delete(jobId);
  jobStatus.delete(jobId);
  lineBuffers.delete(jobId);
}

export function initializeJob(jobId: string, initialMessage?: string): void {
  const entries: LogEntry[] = [];
  if (initialMessage) {
    entries.push({
      type: "info",
      content: initialMessage,
      timestamp: Date.now(),
    });
  }
  outputBuffers.set(jobId, entries);
  jobStatus.set(jobId, "running");
}

export function appendJobEntry(jobId: string, entry: LogEntry): void {
  const buffer = outputBuffers.get(jobId) || [];
  buffer.push(entry);
  outputBuffers.set(jobId, buffer);
}

/**
 * Process streaming output from Claude and append parsed entries to job buffer
 */
export function processClaudeOutput(jobId: string, data: string): void {
  console.log(`[claude-output] jobId=${jobId} dataLen=${data.length} data=${data.slice(0, 200)}`);

  const buffer = outputBuffers.get(jobId) || [];
  let lineBuffer = lineBuffers.get(jobId) || "";

  // Accumulate data and process complete lines
  lineBuffer += data;
  const lines = lineBuffer.split("\n");

  // Keep the last incomplete line in the buffer
  lineBuffer = lines.pop() || "";
  lineBuffers.set(jobId, lineBuffer);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try to parse as JSON first
    const entries = parseStreamJsonEvent(trimmed);
    if (entries.length > 0) {
      buffer.push(...entries);
    } else if (!trimmed.startsWith("{")) {
      // Non-JSON output (raw text)
      const rawEntry = parseRawOutput(trimmed);
      if (rawEntry) {
        buffer.push(rawEntry);
      }
    }
  }

  outputBuffers.set(jobId, buffer);
}
