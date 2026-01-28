import { useState } from "react";
import { Link } from "react-router-dom";
import type { Lead, Person, LeadScore } from "@/lib/tauri/types";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { EmptyState, SmallEmptyState } from "@/components/ui/empty-state";
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
} from "@tabler/icons-react";
import { ScoreBreakdown } from "@/components/leads/score-breakdown";
import { useIsJobActive } from "@/lib/hooks/use-stream-tabs";
import { useJobSubmission } from "@/lib/hooks/use-job-submission";
import { toast } from "sonner";
import { startScoring, startResearch } from "@/lib/tauri/commands";
import { handleStreamEvent } from "@/lib/stream/handle-stream-event";
import { useAuthStore } from "@/lib/store/auth-store";

interface LeadResearchPanelProps {
  lead: Lead;
  companyResearch: string | null;
  people: Person[];
  score?: LeadScore | null;
}

export function LeadResearchPanel({
  lead,
  companyResearch,
  people,
  score,
}: LeadResearchPanelProps) {
  const [activeTab, setActiveTab] = useState<"company" | "people" | "score">("company");

  const isResearchJobActive = useIsJobActive(lead.id, "company");
  const isScoringJobActive = useIsJobActive(lead.id, "scoring");

  const { submit: submitResearch } = useJobSubmission();
  const { submit: submitScoring } = useJobSubmission();

  const handleStartResearch = async () => {
    await submitResearch(async () => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();
      if (!clerkOrgId) {
        toast.error("No organization selected");
        throw new Error("Cannot start research: No organization selected");
      }
      // Start the research - backend will emit job-created, job-logs-appended, job-status-changed events
      // Event bridge handles tab creation and status updates
      // Logs stream directly via Channel callback for real-time display
      const result = await startResearch(lead.id, handleStreamEvent, undefined, clerkOrgId);

      toast.success(`Started research for ${lead.companyName}`);
      return result;
    }).catch((error) => {
      console.error("Failed to start research:", error);
      toast.error("Failed to start research");
    });
  };

  const handleScore = async () => {
    await submitScoring(async () => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();
      if (!clerkOrgId) {
        toast.error("No organization selected");
        throw new Error("Cannot start scoring: No organization selected");
      }
      // Start scoring - backend will emit events
      // Logs stream directly via Channel callback for real-time display
      const result = await startScoring(lead.id, handleStreamEvent, clerkOrgId);

      toast.success(`Started scoring for ${lead.companyName}`);
      return result;
    }).catch((error) => {
      console.error("Failed to start scoring:", error);
      toast.error("Failed to start scoring");
    });
  };

  const showResearchButton = activeTab !== "score";
  const showScoreButton = activeTab === "score";

  const hasCompany = !!companyResearch;
  const hasPeople = people.length > 0;
  const hasAnyContent = hasCompany || hasPeople;

  if (!hasAnyContent) {
    return (
      <EmptyState
        icon={IconFileText}
        title="No research available"
        description="Research data for this company hasn't been generated yet."
        action={{
          label: "Start Research",
          loadingLabel: "Researching...",
          onClick: handleStartResearch,
          isLoading: isResearchJobActive,
          icon: IconPlayerPlay,
        }}
      />
    );
  }

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
        {showResearchButton && (
          <Button variant="outline" size="sm" onClick={handleStartResearch} disabled={isResearchJobActive}>
            {isResearchJobActive ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconRefresh className="h-4 w-4" />
            )}
            {isResearchJobActive ? "Researching..." : "Re-run Research"}
          </Button>
        )}
        {showScoreButton && (
          <Button variant="outline" size="sm" onClick={handleScore} disabled={isScoringJobActive}>
            {isScoringJobActive ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconTargetArrow className="h-4 w-4" />
            )}
            {isScoringJobActive ? "Scoring..." : "Score"}
          </Button>
        )}
      </div>

      <div className="min-h-[300px]">
        {activeTab === "company" && <CompanyContent content={companyResearch} />}
        {activeTab === "people" && <PeopleList people={people} />}
        {activeTab === "score" && <ScoreContent score={score} />}
      </div>
    </div>
  );
}

function CompanyContent({ content }: { content: string | null }) {
  if (!content) {
    return <SmallEmptyState icon={IconBuilding} message="No company research available yet." />;
  }
  return <MarkdownRenderer content={content} />;
}

function PeopleList({ people }: { people: Person[] }) {
  if (people.length === 0) {
    return <SmallEmptyState icon={IconUsers} message="No people data available yet." />;
  }

  return (
    <div className="space-y-2">
      {people.map((person) => {
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
          <Link
            key={person.id}
            to={`/people/${person.id}`}
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
              {person.yearJoined && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IconCalendar className="w-3.5 h-3.5" />
                  <span>{person.yearJoined}</span>
                </div>
              )}
              {person.email && (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = `mailto:${person.email}`;
                  }}
                  className="p-1.5 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                  title={person.email}
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
          </Link>
        );
      })}
    </div>
  );
}

function ScoreContent({ score }: { score: LeadScore | null | undefined }) {
  if (!score) {
    return (
      <SmallEmptyState
        icon={IconTargetArrow}
        message="No score data available yet. Score this lead to see the breakdown."
      />
    );
  }

  return <ScoreBreakdown score={score} />;
}
