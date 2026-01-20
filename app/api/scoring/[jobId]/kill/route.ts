import { NextRequest, NextResponse } from "next/server";
import { getActiveJob, removeActiveJob } from "@/lib/research/spawn-claude";
import { setJobStatus, clearJobOutput } from "@/lib/research/job-state";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const job = getActiveJob(jobId);

  if (!job) {
    return NextResponse.json(
      { success: true, message: "Job not found or already completed" },
      { status: 200 }
    );
  }

  try {
    job.kill();
    removeActiveJob(jobId);
    setJobStatus(jobId, "error");

    setTimeout(() => {
      clearJobOutput(jobId);
    }, 5000);

    return NextResponse.json({ success: true, message: "Scoring job killed" });
  } catch (error) {
    console.error("Failed to kill scoring job:", error);
    return NextResponse.json(
      { success: false, error: "Failed to kill scoring job" },
      { status: 500 }
    );
  }
}
