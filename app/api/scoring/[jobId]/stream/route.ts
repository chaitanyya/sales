import { NextRequest } from "next/server";
import { getJobOutput, getJobStatus, clearJobOutput } from "@/app/api/scoring/route";
import { LogEntry, JobStatus } from "@/lib/types/claude";

export const dynamic = "force-dynamic";

const ACTIVE_POLL_INTERVAL = 100;
const IDLE_POLL_INTERVAL = 250;
const IDLE_THRESHOLD = 10;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const url = new URL(request.url);
  const fromParam = url.searchParams.get("from");
  const startIndex = fromParam ? parseInt(fromParam, 10) : 0;

  const encoder = new TextEncoder();
  let lastIndex = isNaN(startIndex) ? 0 : startIndex;
  let isActive = true;
  let idlePolls = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      const sendLogEntries = (entries: LogEntry[]) => {
        for (const entry of entries) {
          sendEvent({
            type: "log",
            logType: entry.type,
            content: entry.content,
            toolName: entry.toolName,
            timestamp: entry.timestamp,
          });
        }
      };

      const handleCompletion = (status: JobStatus) => {
        switch (status) {
          case "completed":
            sendEvent({ type: "complete", message: "Scoring completed successfully" });
            break;
          case "timeout":
            sendEvent({ type: "error", message: "Scoring timed out" });
            break;
          case "error":
            sendEvent({ type: "error", message: "Scoring failed" });
            break;
        }
        clearJobOutput(jobId);
        controller.close();
      };

      const poll = async () => {
        while (isActive) {
          const output = getJobOutput(jobId);
          const status = getJobStatus(jobId);

          if (output.length > lastIndex) {
            const newEntries = output.slice(lastIndex);
            sendLogEntries(newEntries);
            lastIndex = output.length;
            idlePolls = 0;
          } else {
            idlePolls++;
          }

          if (status && status !== "running") {
            const finalOutput = getJobOutput(jobId);
            if (finalOutput.length > lastIndex) {
              sendLogEntries(finalOutput.slice(lastIndex));
            }
            handleCompletion(status);
            return;
          }

          const pollInterval =
            idlePolls >= IDLE_THRESHOLD ? IDLE_POLL_INTERVAL : ACTIVE_POLL_INTERVAL;

          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
      };

      poll();
    },
    cancel() {
      isActive = false;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
