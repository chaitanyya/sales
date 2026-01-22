import { Layer, Effect, Context } from "effect";
import { randomUUID } from "crypto";
import { spawn, execSync } from "child_process";
import {
  ClaudeError,
  ClaudeTimeoutError,
  QueueTimeoutError,
  JobNotFoundError,
  ProcessResult,
  ExitReason,
  findClaudePath,
} from "./claude-effect";

// ============================================================================
// Configuration
// ============================================================================

const MAX_CONCURRENT_JOBS = 5;
const QUEUE_TIMEOUT_MS = 30_000; // Wait up to 30s for a slot
const DEFAULT_JOB_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// ============================================================================
// Types
// ============================================================================

export interface ResearchJobOptions {
  jobId?: string;
  prompt: string;
  workingDir?: string;
  timeoutMs?: number;
  model?: string;
  onData: (data: string) => void;
  onExit?: (code: number, reason: ExitReason) => void;
}

export interface JobInfo {
  jobId: string;
  startTime: number;
  status: "queued" | "running";
}

// ============================================================================
// Service Interface
// ============================================================================

export class ResearchService extends Context.Tag("ResearchService")<
  ResearchService,
  {
    readonly startResearch: (
      opts: ResearchJobOptions
    ) => Effect.Effect<{ jobId: string; status: "started" | "queued" }, ClaudeError>;
    readonly killJob: (jobId: string) => Effect.Effect<void, JobNotFoundError>;
    readonly getActiveJobCount: () => Effect.Effect<number>;
    readonly getActiveJobs: () => Effect.Effect<JobInfo[]>;
    readonly isJobActive: (jobId: string) => Effect.Effect<boolean>;
  }
>() {}

// ============================================================================
// Internal Types
// ============================================================================

interface ActiveJobEntry {
  abortController: AbortController;
  startTime: number;
  status: "queued" | "running";
  onExit?: (code: number, reason: ExitReason) => void;
}

// ============================================================================
// Simple Semaphore Implementation (for queue management)
// ============================================================================

class SimpleSemaphore {
  private permits: number;
  private waitQueue: Array<{ resolve: () => void; signal?: AbortSignal }> = [];

  constructor(maxPermits: number) {
    this.permits = maxPermits;
  }

  async acquire(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new Error("Aborted");
    }

    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const entry = { resolve, signal };
      this.waitQueue.push(entry);

      if (signal) {
        signal.addEventListener("abort", () => {
          const index = this.waitQueue.indexOf(entry);
          if (index !== -1) {
            this.waitQueue.splice(index, 1);
            reject(new Error("Aborted"));
          }
        });
      }
    });
  }

  release(): void {
    const next = this.waitQueue.shift();
    if (next) {
      next.resolve();
    } else {
      this.permits++;
    }
  }
}

// ============================================================================
// Global State (persists across HMR)
// ============================================================================

const globalForService = globalThis as unknown as {
  researchServiceState?: {
    semaphore: SimpleSemaphore;
    activeJobs: Map<string, ActiveJobEntry>;
  };
};

if (!globalForService.researchServiceState) {
  globalForService.researchServiceState = {
    semaphore: new SimpleSemaphore(MAX_CONCURRENT_JOBS),
    activeJobs: new Map<string, ActiveJobEntry>(),
  };
}

const { semaphore, activeJobs } = globalForService.researchServiceState;

// ============================================================================
// Direct Process Spawning (works reliably in Next.js)
// ============================================================================

async function runResearchJob(
  jobId: string,
  opts: ResearchJobOptions,
  abortController: AbortController
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_JOB_TIMEOUT_MS;
  const workingDir = opts.workingDir ?? process.cwd();

  try {
    console.log(`[effect-runtime] jobId=${jobId} acquiring semaphore`);
    await semaphore.acquire(abortController.signal);
    console.log(`[effect-runtime] jobId=${jobId} semaphore acquired`);

    // Update status to running
    const entry = activeJobs.get(jobId);
    if (entry) {
      activeJobs.set(jobId, { ...entry, status: "running" });
    }

    // Find Claude path
    let claudePath: string;
    try {
      claudePath = findClaudePath();
    } catch {
      claudePath = execSync("which claude", { encoding: "utf-8" }).trim();
    }
    console.log(`[effect-runtime] jobId=${jobId} claude path: ${claudePath}`);

    // Create timeout handler
    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new ClaudeTimeoutError({ jobId, timeoutMs }));
      }, timeoutMs);

      abortController.signal.addEventListener("abort", () => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(new Error("Aborted"));
      });
    });

    // Spawn the process
    const processPromise = new Promise<ProcessResult>((resolve, reject) => {
      console.log(`[effect-runtime] jobId=${jobId} spawning process`);

      const args = [
        "-p",
        opts.prompt,
        "--output-format",
        "stream-json",
        "--verbose",
        "--dangerously-skip-permissions",
        "--chrome",
      ];

      if (opts.model) {
        args.push("--model", opts.model);
      }

      const child = spawn(claudePath, args, {
        cwd: workingDir,
        env: { ...process.env, TERM: "xterm-256color", FORCE_COLOR: "1" },
        stdio: ["pipe", "pipe", "pipe"],
      });

      console.log(`[effect-runtime] jobId=${jobId} spawned pid=${child.pid}`);

      child.stdout?.on("data", (data: Buffer) => {
        opts.onData(data.toString());
      });

      child.stderr?.on("data", (data: Buffer) => {
        opts.onData(data.toString());
      });

      child.on("error", (err) => {
        console.error(`[effect-runtime] jobId=${jobId} process error:`, err);
        reject(err);
      });

      child.on("close", (code) => {
        console.log(`[effect-runtime] jobId=${jobId} process closed with code=${code}`);
        if (timeoutId) clearTimeout(timeoutId);
        resolve({ exitCode: code ?? 0, reason: "completed" });
      });

      child.stdin?.end();

      // Handle abort
      abortController.signal.addEventListener("abort", () => {
        console.log(`[effect-runtime] jobId=${jobId} aborting process`);
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!child.killed) child.kill("SIGKILL");
        }, 2000);
      });
    });

    // Race between job completion and timeout
    const result = await Promise.race([processPromise, timeoutPromise]);

    console.log(`[effect-runtime] jobId=${jobId} completed with code=${result.exitCode}`);
    opts.onExit?.(result.exitCode, result.reason);
  } catch (error) {
    console.error(`[effect-runtime] jobId=${jobId} error:`, error);
    const err = error as { _tag?: string; message?: string };
    const reason: ExitReason =
      err._tag === "ClaudeTimeoutError"
        ? "timeout"
        : err.message === "Aborted"
          ? "killed"
          : "completed";
    opts.onExit?.(1, reason);
  } finally {
    console.log(`[effect-runtime] jobId=${jobId} releasing semaphore`);
    semaphore.release();
    activeJobs.delete(jobId);
  }
}

// ============================================================================
// Service Implementation Layer
// ============================================================================

export const ResearchServiceLive = Layer.succeed(ResearchService, {
  startResearch: (opts: ResearchJobOptions) =>
    Effect.sync(() => {
      const jobId = opts.jobId ?? randomUUID();
      const startTime = Date.now();

      // Check if this will be queued
      const willBeQueued = activeJobs.size >= MAX_CONCURRENT_JOBS;

      // Create abort controller for cancellation
      const abortController = new AbortController();

      // Track the job
      activeJobs.set(jobId, {
        abortController,
        startTime,
        status: willBeQueued ? "queued" : "running",
        onExit: opts.onExit,
      });

      // Start the job in background (fire-and-forget)
      // This runs in the Node.js event loop, proven to work in Next.js
      runResearchJob(jobId, opts, abortController).catch((error) => {
        console.error(`[effect-runtime] jobId=${jobId} unhandled error:`, error);
      });

      return {
        jobId,
        status: willBeQueued ? ("queued" as const) : ("started" as const),
      };
    }),

  killJob: (jobId: string) =>
    Effect.sync(() => {
      const entry = activeJobs.get(jobId);
      if (!entry) {
        throw new JobNotFoundError({ jobId });
      }
      entry.abortController.abort();
    }).pipe(
      Effect.catchAll(() => Effect.fail(new JobNotFoundError({ jobId })))
    ),

  getActiveJobCount: () => Effect.succeed(activeJobs.size),

  getActiveJobs: () =>
    Effect.succeed(
      Array.from(activeJobs.entries()).map(([jobId, entry]) => ({
        jobId,
        startTime: entry.startTime,
        status: entry.status,
      }))
    ),

  isJobActive: (jobId: string) => Effect.succeed(activeJobs.has(jobId)),
});

// ============================================================================
// Helper Functions for Running Effects
// ============================================================================

export const runWithResearchService = <A, E>(
  effect: Effect.Effect<A, E, ResearchService>
): Promise<A> => Effect.runPromise(effect.pipe(Effect.provide(ResearchServiceLive)));

// ============================================================================
// Graceful Shutdown
// ============================================================================

export const shutdownResearchRuntime = async (): Promise<void> => {
  console.log(`[effect-runtime] Shutting down: killing ${activeJobs.size} active jobs`);

  for (const [jobId, entry] of activeJobs.entries()) {
    console.log(`[effect-runtime] Aborting job ${jobId}`);
    entry.abortController.abort();
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));
  activeJobs.clear();
};

// Register shutdown handlers
if (typeof process !== "undefined") {
  const handleShutdown = () => {
    shutdownResearchRuntime()
      .then(() => {
        console.log("[effect-runtime] Shutdown complete");
        process.exit(0);
      })
      .catch((e) => {
        console.error("[effect-runtime] Error during shutdown:", e);
        process.exit(1);
      });
  };

  if (!(globalThis as { shutdownRegistered?: boolean }).shutdownRegistered) {
    (globalThis as { shutdownRegistered?: boolean }).shutdownRegistered = true;
    process.on("SIGTERM", handleShutdown);
    process.on("SIGINT", handleShutdown);
  }
}
