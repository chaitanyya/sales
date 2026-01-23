"use client";

import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { EmptyState } from "@/components/ui/empty-state";
import { useIsJobActive } from "@/lib/hooks/use-stream-tabs";
import { useJobSubmission } from "@/lib/hooks/use-job-submission";
import { IconPlayerPlay, IconFileText } from "@tabler/icons-react";
import { startConversationGeneration } from "@/lib/tauri/commands";
import { handleStreamEvent } from "@/lib/stream/handle-stream-event";
import { toast } from "sonner";

interface PersonConversationPanelProps {
  personId: number;
  personName: string;
  conversationTopics: string | null;
  companyName: string;
}

export function PersonConversationPanel({
  personId,
  personName,
  conversationTopics,
  companyName,
}: PersonConversationPanelProps) {
  const isJobActive = useIsJobActive(personId, "conversation");
  const { submit } = useJobSubmission();

  const handleStartGeneration = async () => {
    await submit(async () => {
      // Start generation - backend will emit events
      // Event bridge handles tab creation and status updates
      // Logs stream directly via Channel callback for real-time display
      const result = await startConversationGeneration(personId, handleStreamEvent);

      toast.success(`Started conversation generation for ${personName}`);
      return result;
    }).catch((error) => {
      console.error("Failed to start conversation generation:", error);
      toast.error("Failed to start conversation generation");
    });
  };

  if (!conversationTopics) {
    return (
      <EmptyState
        icon={IconFileText}
        title="No conversation topics"
        description={`Generate personalized conversation topics for ${personName} at ${companyName}.`}
        action={{
          label: "Generate Topics",
          loadingLabel: "Generating...",
          onClick: handleStartGeneration,
          isLoading: isJobActive,
          icon: IconPlayerPlay,
        }}
      />
    );
  }

  return (
    <div className="min-h-[300px]">
      <MarkdownRenderer content={conversationTopics} />
    </div>
  );
}
