import { createStreamRouteHandler } from "@/lib/api/handlers/stream-handler";
import { getJobOutput, getJobStatus, clearJobOutput } from "@/app/api/scoring/route";

export const dynamic = "force-dynamic";

export const GET = createStreamRouteHandler({
  completionMessages: {
    completed: "Scoring completed successfully",
    timeout: "Scoring timed out",
    error: "Scoring failed",
  },
  getJobOutput,
  getJobStatus,
  clearJobOutput,
});
