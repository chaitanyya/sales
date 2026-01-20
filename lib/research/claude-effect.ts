import { Data } from "effect";
import { execSync } from "child_process";
import { env } from "@/lib/env";

// ============================================================================
// Typed Errors
// ============================================================================

export class ClaudeNotFoundError extends Data.TaggedError("ClaudeNotFoundError")<{
  message: string;
}> {}

export class ClaudeSpawnError extends Data.TaggedError("ClaudeSpawnError")<{
  message: string;
  cause?: unknown;
}> {}

export class ClaudeTimeoutError extends Data.TaggedError("ClaudeTimeoutError")<{
  jobId: string;
  timeoutMs: number;
}> {}

export class ClaudeKilledError extends Data.TaggedError("ClaudeKilledError")<{
  jobId: string;
}> {}

export class QueueTimeoutError extends Data.TaggedError("QueueTimeoutError")<{
  jobId: string;
}> {}

export class JobNotFoundError extends Data.TaggedError("JobNotFoundError")<{
  jobId: string;
}> {}

export type ClaudeError =
  | ClaudeNotFoundError
  | ClaudeSpawnError
  | ClaudeTimeoutError
  | ClaudeKilledError
  | QueueTimeoutError
  | JobNotFoundError;

// ============================================================================
// Types
// ============================================================================

export type ExitReason = "completed" | "timeout" | "killed";

export interface ProcessResult {
  exitCode: number;
  reason: ExitReason;
}

// ============================================================================
// Find Claude CLI Path
// ============================================================================

export function findClaudePath(): string {
  if (env.CLAUDE_PATH) return env.CLAUDE_PATH;

  try {
    return execSync("which claude", { encoding: "utf-8" }).trim();
  } catch {
    const commonPaths = [
      "/usr/local/bin/claude",
      "/opt/homebrew/bin/claude",
      `${process.env.HOME}/.local/bin/claude`,
    ];

    for (const p of commonPaths) {
      try {
        execSync(`test -x "${p}"`, { encoding: "utf-8" });
        return p;
      } catch {
        continue;
      }
    }

    throw new Error(
      "Claude CLI not found. Please install it or set CLAUDE_PATH environment variable."
    );
  }
}
