import { NextRequest, NextResponse } from "next/server";
import { Effect } from "effect";
import { ResearchService, ResearchServiceLive } from "@/lib/research/research-service";
import { setJobStatus, clearJobOutput } from "@/lib/research/job-state";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const program = Effect.gen(function* () {
    const service = yield* ResearchService;

    // Check if job is active
    const isActive = yield* service.isJobActive(jobId);
    if (!isActive) {
      return { found: false };
    }

    // Kill the job
    yield* service.killJob(jobId);
    return { found: true };
  });

  try {
    const result = await Effect.runPromise(program.pipe(Effect.provide(ResearchServiceLive)));

    if (!result.found) {
      // Job might have already completed or been killed
      return NextResponse.json(
        { success: true, message: "Job not found or already completed" },
        { status: 200 }
      );
    }

    setJobStatus(jobId, "error");

    // Clear job output after a delay to allow any final messages
    setTimeout(() => {
      clearJobOutput(jobId);
    }, 5000);

    return NextResponse.json({ success: true, message: "Scoring job killed" });
  } catch (error) {
    // Handle JobNotFoundError specifically
    const err = error as { _tag?: string };
    if (err._tag === "JobNotFoundError") {
      return NextResponse.json(
        { success: true, message: "Job not found or already completed" },
        { status: 200 }
      );
    }

    console.error("Failed to kill scoring job:", error);
    return NextResponse.json(
      { success: false, error: "Failed to kill scoring job" },
      { status: 500 }
    );
  }
}
