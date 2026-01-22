"use client";

import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { EmptyState } from "@/components/ui/empty-state";
import { useAgentAction } from "@/hooks/use-agent-action";
import { IconPlayerPlay, IconFileText } from "@tabler/icons-react";

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
  const { startAction, isStarting } = useAgentAction({
    entityId: personId,
    entityType: "conversation",
    entityLabel: `${personName} - Conversation`,
    apiEndpoint: "/api/conversation",
    killEndpoint: "/api/conversation",
  });

  const startGeneration = () => startAction({ body: { personId } });

  if (!conversationTopics) {
    return (
      <EmptyState
        icon={IconFileText}
        title="No conversation topics"
        description={`Generate personalized conversation topics for ${personName} at ${companyName}.`}
        action={{
          label: "Generate Topics",
          loadingLabel: "Starting...",
          onClick: startGeneration,
          isLoading: isStarting,
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
