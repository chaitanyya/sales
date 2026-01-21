"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PersonResearchPanel } from "./person-research-panel";
import { PersonConversationPanel } from "./person-conversation-panel";
import { IconUser, IconMessageCircle, IconRefresh, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useAgentAction } from "@/hooks/use-agent-action";

interface PersonProfileTabsProps {
  personId: number;
  personName: string;
  personProfile: string | null;
  conversationTopics: string | null;
  companyName: string;
}

export function PersonProfileTabs({
  personId,
  personName,
  personProfile,
  conversationTopics,
  companyName,
}: PersonProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "conversation">("profile");

  const { startAction: startResearch, isStarting: isResearchStarting } = useAgentAction({
    entityId: personId,
    entityType: "person",
    entityLabel: personName,
    apiEndpoint: "/api/research",
    killEndpoint: "/api/research",
  });

  const { startAction: startConversation, isStarting: isConversationStarting } = useAgentAction({
    entityId: personId,
    entityType: "conversation",
    entityLabel: `${personName} - Conversation`,
    apiEndpoint: "/api/conversation",
    killEndpoint: "/api/conversation",
  });

  const handleResearch = () => startResearch({ body: { personId } });
  const handleConversation = () => startConversation({ body: { personId } });

  const isStarting = isResearchStarting || isConversationStarting;
  const showProfileButton = activeTab === "profile" && !!personProfile;
  const showConversationButton = activeTab === "conversation" && !!conversationTopics;

  return (
    <Tabs
      defaultValue="profile"
      className="w-full"
      onValueChange={(v) => setActiveTab(v as "profile" | "conversation")}
    >
      <div className="flex items-center justify-between mb-4">
        <TabsList variant="line">
          <TabsTrigger value="profile" className="gap-2">
            <IconUser className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="conversation" className="gap-2">
            <IconMessageCircle className="w-4 h-4" />
            Conversation
          </TabsTrigger>
        </TabsList>
        {showProfileButton && (
          <Button variant="outline" size="sm" onClick={handleResearch} disabled={isStarting}>
            {isResearchStarting ? (
              <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <IconRefresh className="h-4 w-4 mr-2" />
            )}
            {isResearchStarting ? "Starting..." : "Re-run Research"}
          </Button>
        )}
        {showConversationButton && (
          <Button variant="outline" size="sm" onClick={handleConversation} disabled={isStarting}>
            {isConversationStarting ? (
              <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <IconRefresh className="h-4 w-4 mr-2" />
            )}
            {isConversationStarting ? "Starting..." : "Regenerate"}
          </Button>
        )}
      </div>

      <TabsContent value="profile">
        <PersonResearchPanel
          personId={personId}
          personName={personName}
          personProfile={personProfile}
          companyName={companyName}
        />
      </TabsContent>

      <TabsContent value="conversation">
        <PersonConversationPanel
          personId={personId}
          personName={personName}
          conversationTopics={conversationTopics}
          companyName={companyName}
        />
      </TabsContent>
    </Tabs>
  );
}
