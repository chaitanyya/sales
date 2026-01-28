import { Button } from "@/components/ui/button";
import { IconTargetArrow, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { startScoring } from "@/lib/tauri/commands";
import { handleStreamEvent } from "@/lib/stream/handle-stream-event";
import { useIsJobActive } from "@/lib/hooks/use-stream-tabs";
import { useJobSubmission } from "@/lib/hooks/use-job-submission";
import { useAuthStore } from "@/lib/store/auth-store";

interface RescoreButtonProps {
  leadId: number;
  companyName: string;
  size?: "sm" | "default";
}

export function RescoreButton({ leadId, companyName, size = "default" }: RescoreButtonProps) {
  const isJobActive = useIsJobActive(leadId, "scoring");
  const { submit } = useJobSubmission();

  const handleRescore = async () => {
    await submit(async () => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();
      if (!clerkOrgId) {
        toast.error("No organization selected");
        throw new Error("Cannot start scoring: No organization selected");
      }
      // Start scoring - backend will emit events
      // Event bridge handles tab creation and status updates
      // Logs stream directly via Channel callback for real-time display
      const result = await startScoring(leadId, handleStreamEvent, clerkOrgId);

      toast.success(`Started scoring for ${companyName}`);
      return result;
    }).catch((error) => {
      console.error("Failed to start scoring:", error);
      toast.error("Failed to start scoring");
    });
  };

  return (
    <Button variant="outline" size={size} onClick={handleRescore} disabled={isJobActive}>
      {isJobActive ? (
        <IconLoader2 className="w-4 h-4 animate-spin" />
      ) : (
        <IconTargetArrow className="w-4 h-4" />
      )}
      {isJobActive ? "Scoring..." : size === "sm" ? "Score" : "Score Lead"}
    </Button>
  );
}
