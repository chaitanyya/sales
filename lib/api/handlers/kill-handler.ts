import { NextRequest, NextResponse } from "next/server";
import { Effect, Layer } from "effect";
import {
  ResearchService,
  ResearchServiceLive,
} from "@/lib/research/research-service";
import { setJobStatus, clearJobOutput } from "@/lib/research/job-state";

type JobType = "research" | "conversation" | "scoring";

const JOB_TYPE_LABELS: Record<JobType, string> = {
  research: "Job",
  conversation: "Job",
  scoring: "Scoring job",
};

export function createKillRouteHandler(jobType: JobType) {
  return async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
  ) {
    const { jobId } = await params;

    const program = Effect.gen(function* () {
      const service = yield* ResearchService;

      const isActive = yield* service.isJobActive(jobId);
      if (!isActive) {
        return { found: false };
      }

      yield* service.killJob(jobId);
      return { found: true };
    });

    const label = JOB_TYPE_LABELS[jobType];

    try {
      const result = await Effect.runPromise(
        program.pipe(Effect.provide(ResearchServiceLive))
      );

      if (!result.found) {
        return NextResponse.json(
          { success: true, message: "Job not found or already completed" },
          { status: 200 }
        );
      }

      setJobStatus(jobId, "error");

      setTimeout(() => {
        clearJobOutput(jobId);
      }, 5000);

      return NextResponse.json({ success: true, message: `${label} killed` });
    } catch (error) {
      const err = error as { _tag?: string };
      if (err._tag === "JobNotFoundError") {
        return NextResponse.json(
          { success: true, message: "Job not found or already completed" },
          { status: 200 }
        );
      }

      console.error(`Failed to kill ${jobType} job:`, error);
      return NextResponse.json(
        { success: false, error: `Failed to kill ${jobType} job` },
        { status: 500 }
      );
    }
  };
}
