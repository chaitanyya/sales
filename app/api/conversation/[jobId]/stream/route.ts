import { createStreamRouteHandler } from "@/lib/api/handlers/stream-handler";
import { getJobOutput, getJobStatus, clearJobOutput } from "@/app/api/conversation/route";

export const dynamic = "force-dynamic";

export const GET = createStreamRouteHandler({
  completionMessages: {
    completed: "Generation completed successfully",
    timeout: "Generation timed out",
    error: "Generation failed",
  },
  getJobOutput,
  getJobStatus,
  clearJobOutput,
});
