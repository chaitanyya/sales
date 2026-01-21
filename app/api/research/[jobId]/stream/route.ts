import { createStreamRouteHandler } from "@/lib/api/handlers/stream-handler";
import { getJobOutput, getJobStatus, clearJobOutput } from "@/app/api/research/route";

export const dynamic = "force-dynamic";

export const GET = createStreamRouteHandler({
  completionMessages: {
    completed: "Research completed successfully",
    timeout: "Research timed out",
    error: "Research failed",
  },
  getJobOutput,
  getJobStatus,
  clearJobOutput,
});
