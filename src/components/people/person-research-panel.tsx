"use client";

import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { EmptyState } from "@/components/ui/empty-state";
import { useIsJobActive } from "@/lib/hooks/use-stream-tabs";
import { useJobSubmission } from "@/lib/hooks/use-job-submission";
import { IconPlayerPlay, IconFileText } from "@tabler/icons-react";
import { startPersonResearch } from "@/lib/tauri/commands";
import { handleStreamEvent } from "@/lib/stream/handle-stream-event";
import { toast } from "sonner";

interface PersonResearchPanelProps {
  personId: number;
  personName: string;
  personProfile: string | null;
  companyName: string | null;
}

export function PersonResearchPanel({
  personId,
  personName,
  personProfile,
  companyName,
}: PersonResearchPanelProps) {
  const isJobActive = useIsJobActive(personId, "person");
  const { submit } = useJobSubmission();

  const handleStartResearch = async () => {
    await submit(async () => {
      // Start the research - backend will emit events
      // Event bridge handles tab creation and status updates
      // Logs stream directly via Channel callback for real-time display
      const result = await startPersonResearch(personId, handleStreamEvent);

      toast.success(`Started research for ${personName}`);
      return result;
    }).catch((error) => {
      console.error("Failed to start research:", error);
      toast.error("Failed to start research");
    });
  };

  if (!personProfile) {
    const description = companyName
      ? `Research data for ${personName} at ${companyName} hasn't been generated yet.`
      : `Research data for ${personName} hasn't been generated yet.`;
    return (
      <EmptyState
        icon={IconFileText}
        title="No research available"
        description={description}
        action={{
          label: "Start Research",
          loadingLabel: "Researching...",
          onClick: handleStartResearch,
          isLoading: isJobActive,
          icon: IconPlayerPlay,
        }}
      />
    );
  }

  return (
    <div className="min-h-[300px]">
      <MarkdownRenderer content={personProfile} />
    </div>
  );
}
