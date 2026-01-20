import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { execSync } from "child_process";
import { env } from "@/lib/env";

const DEFAULT_TIMEOUT = 10 * 60 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const MAX_JOB_AGE = 30 * 60 * 1000;

export type ExitReason = "completed" | "timeout" | "killed";

export interface ClaudeProcessOptions {
  prompt: string;
  workingDir?: string;
  timeout?: number;
  onData?: (data: string) => void;
  onExit?: (code: number, reason?: ExitReason) => void;
}

export interface ClaudeProcess extends EventEmitter {
  kill: () => void;
  startTime: number;
}

interface ActiveJobEntry {
  process: ClaudeProcess;
  childProcess: ChildProcess;
  startTime: number;
}

function findClaudePath(): string {
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

export function spawnClaude(options: ClaudeProcessOptions): ClaudeProcess {
  const { prompt, workingDir = process.cwd(), timeout = DEFAULT_TIMEOUT, onData, onExit } = options;

  const emitter = new EventEmitter() as ClaudeProcess;
  const claudePath = findClaudePath();
  const startTime = Date.now();
  emitter.startTime = startTime;

  const childProcess = spawn(
    claudePath,
    [
      "-p",
      prompt,
      "--output-format",
      "stream-json",
      "--verbose",
      "--dangerously-skip-permissions",
      "--chrome",
    ],
    {
      cwd: workingDir,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        FORCE_COLOR: "1",
      },
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  let hasExited = false;
  let timeoutTimer: NodeJS.Timeout | null = null;
  let killTimer: NodeJS.Timeout | null = null;

  const cleanup = () => {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
    if (killTimer) {
      clearTimeout(killTimer);
      killTimer = null;
    }
  };

  const handleExit = (code: number, reason: ExitReason) => {
    if (hasExited) return;
    hasExited = true;
    cleanup();
    emitter.emit("exit", code, reason);
    onExit?.(code, reason);
  };

  // Set up timeout
  timeoutTimer = setTimeout(() => {
    if (hasExited) return;

    // Send SIGTERM first
    childProcess.kill("SIGTERM");
    onData?.("\n[Process timeout - sending SIGTERM]\n");

    // If still running after 5s, send SIGKILL
    killTimer = setTimeout(() => {
      if (!hasExited) {
        childProcess.kill("SIGKILL");
        onData?.("\n[Process did not terminate - sending SIGKILL]\n");
      }
    }, 5000);

    // Mark as timeout exit
    handleExit(1, "timeout");
  }, timeout);

  childProcess.stdout?.on("data", (data: Buffer) => {
    const str = data.toString();
    emitter.emit("data", str);
    onData?.(str);
  });

  childProcess.stderr?.on("data", (data: Buffer) => {
    const str = data.toString();
    emitter.emit("data", str);
    onData?.(str);
  });

  childProcess.on("error", (error) => {
    emitter.emit("data", `Error: ${error.message}\n`);
    onData?.(`Error: ${error.message}\n`);
    handleExit(1, "completed");
  });

  childProcess.on("close", (code) => {
    handleExit(code || 0, "completed");
  });

  childProcess.on("spawn", () => {
    // Close stdin since we don't need to send input
    childProcess.stdin?.end();
  });

  emitter.kill = () => {
    if (!hasExited) {
      childProcess.kill("SIGTERM");
      // Force kill after 2 seconds if needed
      setTimeout(() => {
        if (!hasExited) {
          childProcess.kill("SIGKILL");
        }
      }, 2000);
      handleExit(1, "killed");
    }
  };

  return emitter;
}

// Store active research jobs with their child processes
// Use globalThis to persist across HMR in development
const globalForJobs = globalThis as unknown as {
  activeJobs: Map<string, ActiveJobEntry>;
};

const activeJobs = globalForJobs.activeJobs ?? new Map<string, ActiveJobEntry>();

if (process.env.NODE_ENV !== "production") {
  globalForJobs.activeJobs = activeJobs;
}

export function getActiveJob(jobId: string): ClaudeProcess | undefined {
  return activeJobs.get(jobId)?.process;
}

export function setActiveJob(
  jobId: string,
  process: ClaudeProcess,
  childProcess?: ChildProcess
): void {
  activeJobs.set(jobId, {
    process,
    childProcess: childProcess as ChildProcess,
    startTime: process.startTime,
  });
}

export function removeActiveJob(jobId: string): void {
  activeJobs.delete(jobId);
}

// Cleanup interval for stale jobs
let cleanupIntervalId: NodeJS.Timeout | null = null;

export function startCleanupInterval(): void {
  if (cleanupIntervalId) return;

  cleanupIntervalId = setInterval(() => {
    const now = Date.now();
    for (const [jobId, entry] of activeJobs.entries()) {
      if (now - entry.startTime > MAX_JOB_AGE) {
        console.log(
          `[cleanup] Killing stale job ${jobId} (age: ${Math.round((now - entry.startTime) / 1000)}s)`
        );
        entry.process.kill();
        activeJobs.delete(jobId);
      }
    }
  }, CLEANUP_INTERVAL);
}

export function stopCleanupInterval(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

// Start cleanup interval on module load
startCleanupInterval();
