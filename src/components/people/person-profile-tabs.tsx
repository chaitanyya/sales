"use client";

import { useState } from "react";
import { PersonResearchPanel } from "./person-research-panel";
import { PersonConversationPanel } from "./person-conversation-panel";
import { IconUser, IconMessageCircle, IconRefresh, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useIsJobActive } from "@/lib/hooks/use-stream-tabs";
import { startPersonResearch, startConversationGeneration } from "@/lib/tauri/commands";
import { handleStreamEvent } from "@/lib/stream/handle-stream-event";
import { toast } from "sonner";

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
  const isResearchJobActive = useIsJobActive(personId, "person");
  const isConversationJobActive = useIsJobActive(personId, "conversation");

  const handleResearch = async () => {
    try {
      // Start research - backend will emit events
      // Stream logs to Zustand via handleStreamEvent
      await startPersonResearch(personId, handleStreamEvent);

      toast.success(`Started research for ${personName}`);
    } catch (error) {
      console.error("Failed to start research:", error);
      toast.error("Failed to start research");
    }
  };

  const handleConversation = async () => {
    try {
      // Start conversation - backend will emit events
      // Stream logs to Zustand via handleStreamEvent
      await startConversationGeneration(personId, handleStreamEvent);

      toast.success(`Started conversation generation for ${personName}`);
    } catch (error) {
      console.error("Failed to start conversation generation:", error);
      toast.error("Failed to start conversation generation");
    }
  };

  const showProfileButton = activeTab === "profile" && !!personProfile;
  const showConversationButton = activeTab === "conversation" && !!conversationTopics;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 border-b border-white/5">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-1 py-2 text-sm border-b-2 transition-colors -mb-px ${
              activeTab === "profile"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <IconUser className="w-4 h-4" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab("conversation")}
            className={`flex items-center gap-2 px-1 py-2 text-sm border-b-2 transition-colors -mb-px ${
              activeTab === "conversation"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <IconMessageCircle className="w-4 h-4" />
            Conversation
          </button>
        </div>
        {showProfileButton && (
          <Button variant="outline" size="sm" onClick={handleResearch} disabled={isResearchJobActive}>
            {isResearchJobActive ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconRefresh className="h-4 w-4" />
            )}
            {isResearchJobActive ? "Researching..." : "Re-run Research"}
          </Button>
        )}
        {showConversationButton && (
          <Button variant="outline" size="sm" onClick={handleConversation} disabled={isConversationJobActive}>
            {isConversationJobActive ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconRefresh className="h-4 w-4" />
            )}
            {isConversationJobActive ? "Generating..." : "Regenerate"}
          </Button>
        )}
      </div>

      <div className="min-h-[300px]">
        {activeTab === "profile" && (
          <PersonResearchPanel
            personId={personId}
            personName={personName}
            personProfile={personProfile}
            companyName={companyName}
          />
        )}
        {activeTab === "conversation" && (
          <PersonConversationPanel
            personId={personId}
            personName={personName}
            conversationTopics={conversationTopics}
            companyName={companyName}
          />
        )}
      </div>
    </div>
  );
}
