"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PersonResearchPanel } from "./person-research-panel";
import { PersonConversationPanel } from "./person-conversation-panel";
import { IconUser, IconMessageCircle, IconRefresh, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";

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
  const [isStarting, setIsStarting] = useState(false);
  const addTab = useStreamPanelStore((state) => state.addTab);
  const findTabByEntity = useStreamPanelStore((state) => state.findTabByEntity);

  const startResearch = async () => {
    setIsStarting(true);

    try {
      const existingTab = findTabByEntity(personId, "person");
      if (existingTab && existingTab.status === "running") {
        try {
          await fetch(`/api/research/${existingTab.jobId}/kill`, { method: "POST" });
        } catch (error) {
          console.error("Failed to kill existing research:", error);
        }
      }

      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to start research: ${res.statusText}`);
      }

      const { jobId } = data;

      addTab({
        jobId,
        label: personName,
        type: "person",
        entityId: personId,
        status: "running",
      });
    } catch (error) {
      console.error("Failed to start research:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const startConversationGeneration = async () => {
    setIsStarting(true);

    try {
      const existingTab = findTabByEntity(personId, "conversation");
      if (existingTab && existingTab.status === "running") {
        try {
          await fetch(`/api/conversation/${existingTab.jobId}/kill`, { method: "POST" });
        } catch (error) {
          console.error("Failed to kill existing generation:", error);
        }
      }

      const res = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to start generation: ${res.statusText}`);
      }

      const { jobId } = data;

      addTab({
        jobId,
        label: `${personName} - Conversation`,
        type: "conversation",
        entityId: personId,
        status: "running",
      });
    } catch (error) {
      console.error("Failed to start conversation generation:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const showProfileButton = activeTab === "profile" && !!personProfile;
  const showConversationButton = activeTab === "conversation" && !!conversationTopics;

  return (
    <Tabs defaultValue="profile" className="w-full" onValueChange={(v) => setActiveTab(v as "profile" | "conversation")}>
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
          <Button variant="outline" size="sm" onClick={startResearch} disabled={isStarting}>
            {isStarting ? (
              <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <IconRefresh className="h-4 w-4 mr-2" />
            )}
            {isStarting ? "Starting..." : "Re-run Research"}
          </Button>
        )}
        {showConversationButton && (
          <Button variant="outline" size="sm" onClick={startConversationGeneration} disabled={isStarting}>
            {isStarting ? (
              <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <IconRefresh className="h-4 w-4 mr-2" />
            )}
            {isStarting ? "Starting..." : "Regenerate"}
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
