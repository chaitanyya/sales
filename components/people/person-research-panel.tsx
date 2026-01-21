"use client";

import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { EmptyState, SmallEmptyState } from "@/components/ui/empty-state";
import { useAgentAction } from "@/hooks/use-agent-action";
import { IconPlayerPlay, IconUser, IconFileText } from "@tabler/icons-react";

interface PersonResearchPanelProps {
  personId: number;
  personName: string;
  personProfile: string | null;
  companyName: string;
}

export function PersonResearchPanel({
  personId,
  personName,
  personProfile,
  companyName,
}: PersonResearchPanelProps) {
  const { startAction, isStarting } = useAgentAction({
    entityId: personId,
    entityType: "person",
    entityLabel: personName,
    apiEndpoint: "/api/research",
    killEndpoint: "/api/research",
  });

  const startResearch = () => startAction({ body: { personId } });

  if (!personProfile) {
    return (
      <EmptyState
        icon={IconFileText}
        title="No research available"
        description={`Research data for ${personName} at ${companyName} hasn't been generated yet.`}
        action={{
          label: "Start Research",
          loadingLabel: "Starting...",
          onClick: startResearch,
          isLoading: isStarting,
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
