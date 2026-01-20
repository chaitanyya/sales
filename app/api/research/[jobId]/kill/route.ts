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
    // Job might have already completed or been killed
    return NextResponse.json(
      { success: true, message: "Job not found or already completed" },
      { status: 200 }
    );
  }

  try {
    job.kill();
    removeActiveJob(jobId);
    setJobStatus(jobId, "error");

    // Clear job output after a delay to allow any final messages
    setTimeout(() => {
      clearJobOutput(jobId);
    }, 5000);

    return NextResponse.json({ success: true, message: "Job killed" });
  } catch (error) {
    console.error("Failed to kill job:", error);
    return NextResponse.json({ success: false, error: "Failed to kill job" }, { status: 500 });
  }
}
