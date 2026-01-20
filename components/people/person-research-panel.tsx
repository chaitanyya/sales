"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  IconPlayerPlay,
  IconUser,
  IconFileText,
  IconRefresh,
  IconLoader2,
} from "@tabler/icons-react";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";

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
  const [isStarting, setIsStarting] = useState(false);
  const addTab = useStreamPanelStore((state) => state.addTab);
  const findTabByEntity = useStreamPanelStore((state) => state.findTabByEntity);

  const hasProfile = !!personProfile;

  const startResearch = async () => {
    setIsStarting(true);

    try {
      // Kill existing research for this entity if running
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

      // Add tab to stream panel (will replace existing tab for same entity)
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

  // If no profile exists, show empty state with research button
  if (!hasProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <IconFileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium mb-1">No research available</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          Research data for {personName} at {companyName} hasn&apos;t been generated yet.
        </p>
        <Button onClick={startResearch} disabled={isStarting}>
          {isStarting ? (
            <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <IconPlayerPlay className="h-4 w-4 mr-2" />
          )}
          {isStarting ? "Starting..." : "Start Research"}
        </Button>
      </div>
    );
  }

  // Show person profile content
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconUser className="w-4 h-4" />
          <span>Profile</span>
        </div>
        <Button variant="outline" size="sm" onClick={startResearch} disabled={isStarting}>
          {isStarting ? (
            <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <IconRefresh className="h-4 w-4 mr-2" />
          )}
          {isStarting ? "Starting..." : "Re-run Research"}
        </Button>
      </div>

      <div className="min-h-[300px]">
        <MarkdownContent content={personProfile} />
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string | null }) {
  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
          <IconUser className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No person research available yet.</p>
      </div>
    );
  }

  return (
    <article className="prose prose-sm prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3 prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-strong:font-semibold prose-code:text-primary prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-blockquote:border-l-primary prose-blockquote:bg-white/[0.02] prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-li:text-muted-foreground prose-li:marker:text-muted-foreground/50 prose-table:text-sm prose-th:text-left prose-th:font-medium prose-th:text-foreground prose-th:border-b prose-th:border-white/10 prose-th:pb-2 prose-td:border-b prose-td:border-white/5 prose-td:py-2 prose-hr:border-white/10">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}
