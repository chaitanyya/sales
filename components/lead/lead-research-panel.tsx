"use client";

import { useState } from "react";
import { Lead, Person } from "@/db/schema";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  IconPlayerPlay,
  IconUser,
  IconBuilding,
  IconFileText,
  IconRefresh,
  IconUsers,
  IconChevronRight,
  IconBrandLinkedin,
  IconMail,
  IconCalendar,
  IconLoader2,
  IconTargetArrow,
  IconMailSearch,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import type { ParsedLeadScore } from "@/lib/types/scoring";
import { ScoreBreakdown } from "@/components/leads/score-breakdown";

interface LeadResearchPanelProps {
  lead: Lead;
  companyResearch: string | null;
  people: Person[];
  score?: ParsedLeadScore | null;
}

export function LeadResearchPanel({
  lead,
  companyResearch,
  people,
  score,
}: LeadResearchPanelProps) {
  const [activeTab, setActiveTab] = useState<"company" | "people" | "score">("company");
  const [isStarting, setIsStarting] = useState(false);
  const addTab = useStreamPanelStore((state) => state.addTab);
  const findTabByEntity = useStreamPanelStore((state) => state.findTabByEntity);

  const hasCompany = !!companyResearch;
  const hasPeople = people.length > 0;
  const hasAnyContent = hasCompany || hasPeople;

  const startResearch = async () => {
    setIsStarting(true);

    try {
      // Kill existing research for this entity if running
      const existingTab = findTabByEntity(lead.id, "company");
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
        body: JSON.stringify({ leadId: lead.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to start research: ${res.statusText}`);
      }

      const { jobId } = data;

      // Add tab to stream panel (will replace existing tab for same entity)
      addTab({
        jobId,
        label: lead.companyName,
        type: "company",
        entityId: lead.id,
        status: "running",
      });
    } catch (error) {
      console.error("Failed to start research:", error);
    } finally {
      setIsStarting(false);
    }
  };

  // If no content exists, show empty state with research button
  if (!hasAnyContent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <IconFileText className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium mb-1">No research available</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          Research data for this company hasn&apos;t been generated yet.
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

  // Show research content with tabs
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 border-b border-white/5">
          <button
            onClick={() => setActiveTab("company")}
            className={`flex items-center gap-2 px-1 py-2 text-sm border-b-2 transition-colors -mb-px ${
              activeTab === "company"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <IconBuilding className="w-4 h-4" />
            Company
          </button>
          <button
            onClick={() => setActiveTab("people")}
            className={`flex items-center gap-2 px-1 py-2 text-sm border-b-2 transition-colors -mb-px ${
              activeTab === "people"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <IconUsers className="w-4 h-4" />
            People ({people.length})
          </button>
          <button
            onClick={() => setActiveTab("score")}
            className={`flex items-center gap-2 px-1 py-2 text-sm border-b-2 transition-colors -mb-px ${
              activeTab === "score"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <IconTargetArrow className="w-4 h-4" />
            Score {score && <span className="text-xs opacity-60">({score.totalScore})</span>}
          </button>
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
        {activeTab === "company" && <MarkdownContent content={companyResearch} />}
        {activeTab === "people" && <PeopleList people={people} leadId={lead.id} />}
        {activeTab === "score" && <ScoreContent score={score} />}
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string | null }) {
  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
          <IconBuilding className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No company research available yet.</p>
      </div>
    );
  }

  return (
    <article className="prose prose-sm prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3 prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-strong:font-semibold prose-code:text-primary prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-blockquote:border-l-primary prose-blockquote:bg-white/[0.02] prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-li:text-muted-foreground prose-li:marker:text-muted-foreground/50 prose-table:text-sm prose-th:text-left prose-th:font-medium prose-th:text-foreground prose-th:border-b prose-th:border-white/10 prose-th:pb-2 prose-td:border-b prose-td:border-white/5 prose-td:py-2 prose-hr:border-white/10">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}

interface EnrichmentResult {
  personId: number;
  name: string;
  email: string | null;
  score: number | null;
  verified: boolean | null;
  verificationStatus: string | null;
  error: string | null;
}

function PeopleList({ people, leadId }: { people: Person[]; leadId: number }) {
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichResults, setEnrichResults] = useState<Map<number, EnrichmentResult>>(new Map());

  const enrichAllPeople = async () => {
    setIsEnriching(true);
    setEnrichResults(new Map());

    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, verifyEmails: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Enrichment failed");
      }

      // Store results by personId
      const resultsMap = new Map<number, EnrichmentResult>();
      for (const result of data.results) {
        resultsMap.set(result.personId, result);
      }
      setEnrichResults(resultsMap);

      // Refresh the page to show updated emails
      window.location.reload();
    } catch (error) {
      console.error("Enrichment failed:", error);
    } finally {
      setIsEnriching(false);
    }
  };

  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
          <IconUsers className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No people data available yet.</p>
      </div>
    );
  }

  const peopleWithoutEmail = people.filter((p) => !p.email);

  return (
    <div className="space-y-4">
      {/* Enrich button */}
      {peopleWithoutEmail.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconMailSearch className="w-4 h-4" />
            <span>
              {peopleWithoutEmail.length} of {people.length} people missing emails
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={enrichAllPeople}
            disabled={isEnriching}
          >
            {isEnriching ? (
              <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <IconMailSearch className="h-4 w-4 mr-2" />
            )}
            {isEnriching ? "Finding emails..." : "Find Emails (Hunter.io)"}
          </Button>
        </div>
      )}

      {/* People list */}
      <div className="space-y-2">
      {people.map((person) => {
        const enrichResult = enrichResults.get(person.id);
        const status = (person.researchStatus || "pending") as
          | "pending"
          | "in_progress"
          | "completed"
          | "failed";
        const statusColors = {
          pending: "bg-muted-foreground/20",
          in_progress: "bg-yellow-500/20",
          completed: "bg-green-500/20",
          failed: "bg-red-500/20",
        };

        return (
          <a
            key={person.id}
            href={`/people/${person.id}`}
            className="flex items-center gap-4 p-3 rounded-lg border border-white/5 hover:bg-white/[0.02] hover:border-white/10 transition-colors cursor-pointer"
          >
            <div
              className={`w-10 h-10 rounded-full ${statusColors[status]} flex items-center justify-center shrink-0`}
            >
              <IconUser className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">
                {person.firstName} {person.lastName}
              </div>
              {person.title && (
                <div className="text-sm text-muted-foreground truncate">{person.title}</div>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Enrichment result indicator */}
              {enrichResult && (
                <div className="flex items-center gap-1.5 text-xs">
                  {enrichResult.email ? (
                    <span className="flex items-center gap-1 text-green-500">
                      <IconCheck className="w-3.5 h-3.5" />
                      {enrichResult.verified ? "Verified" : `${enrichResult.score}%`}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <IconX className="w-3.5 h-3.5" />
                      Not found
                    </span>
                  )}
                </div>
              )}
              {person.yearJoined && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IconCalendar className="w-3.5 h-3.5" />
                  <span>{person.yearJoined}</span>
                </div>
              )}
              {(person.email || enrichResult?.email) && (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = `mailto:${person.email || enrichResult?.email}`;
                  }}
                  className="p-1.5 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                  title={person.email || enrichResult?.email || undefined}
                >
                  <IconMail className="w-4 h-4" />
                </span>
              )}
              {person.linkedinUrl && (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(person.linkedinUrl!, "_blank");
                  }}
                  className="p-1.5 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                  title="LinkedIn Profile"
                >
                  <IconBrandLinkedin className="w-4 h-4" />
                </span>
              )}
              <IconChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </div>
          </a>
        );
      })}
      </div>
    </div>
  );
}

function ScoreContent({ score }: { score: ParsedLeadScore | null | undefined }) {
  if (!score) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
          <IconTargetArrow className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          No score data available yet. Score this lead to see the breakdown.
        </p>
      </div>
    );
  }

  return <ScoreBreakdown score={score} />;
}
