import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getLead, getAdjacentLeads, getPeopleForLead, getLeadScore } from "@/lib/db/queries";
import {
  IconArrowLeft,
  IconChevronDown,
  IconChevronUp,
  IconStar,
  IconDotsVertical,
  IconCircle,
  IconLoader2,
  IconCircleCheck,
  IconCircleX,
  IconBuilding,
  IconMapPin,
  IconBrandLinkedin,
  IconWorld,
  IconCalendar,
  IconUsers,
} from "@tabler/icons-react";
import { LeadResearchPanel } from "@/components/lead/lead-research-panel";
import { ScoreCard } from "@/components/leads/score-bars";
import { RescoreButton } from "@/components/leads/rescore-button";

// Revalidate data every 30 seconds
export const revalidate = 30;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const leadId = parseInt(id, 10);

  if (isNaN(leadId)) {
    return { title: "Lead Not Found" };
  }

  const lead = await getLead(leadId);

  if (!lead) {
    return { title: "Lead Not Found" };
  }

  return {
    title: lead.companyName,
    description: `${lead.companyName}${lead.industry ? ` - ${lead.industry}` : ""}`,
  };
}

type StatusType = "pending" | "in_progress" | "completed" | "failed";

const statusConfig: Record<
  StatusType,
  { label: string; icon: typeof IconCircle; color: string; bgColor: string }
> = {
  pending: {
    label: "Pending",
    icon: IconCircle,
    color: "text-muted-foreground",
    bgColor: "bg-muted-foreground/20",
  },
  in_progress: {
    label: "In Progress",
    icon: IconLoader2,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/20",
  },
  completed: {
    label: "Completed",
    icon: IconCircleCheck,
    color: "text-green-500",
    bgColor: "bg-green-500/20",
  },
  failed: { label: "Failed", icon: IconCircleX, color: "text-red-500", bgColor: "bg-red-500/20" },
};

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const leadId = parseInt(id, 10);

  if (isNaN(leadId)) {
    notFound();
  }

  const lead = await getLead(leadId);

  if (!lead) {
    notFound();
  }

  const domain = lead.website?.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0] || null;

  // Fetch adjacent leads, people, and score
  const [adjacentLeads, peopleList, score] = await Promise.all([
    getAdjacentLeads(leadId),
    getPeopleForLead(leadId),
    getLeadScore(leadId),
  ]);

  const { companyProfile } = lead;
  const { prevLead, nextLead, currentIndex, total } = adjacentLeads;

  const status = (lead.researchStatus || "pending") as StatusType;
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <>
      {/* Header bar */}
      <header className="h-10 border-b border-white/5 flex items-center px-3 gap-2">
        {/* Breadcrumb */}
        <Link
          href="/lead"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-1.5 text-sm">
          <Link href="/lead" className="text-muted-foreground hover:text-foreground">
            Leads
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{lead.companyName}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-2">
          <button className="p-1 rounded hover:bg-white/5 text-muted-foreground">
            <IconStar className="w-4 h-4" />
          </button>
          <button className="p-1 rounded hover:bg-white/5 text-muted-foreground">
            <IconDotsVertical className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Navigation between leads */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>
            {currentIndex} / {total}
          </span>
          <Link
            href={prevLead ? `/lead/${prevLead.id}` : "#"}
            className={`p-1 rounded hover:bg-white/5 ${!prevLead ? "opacity-30 pointer-events-none" : ""}`}
          >
            <IconChevronUp className="w-4 h-4" />
          </Link>
          <Link
            href={nextLead ? `/lead/${nextLead.id}` : "#"}
            className={`p-1 rounded hover:bg-white/5 ${!nextLead ? "opacity-30 pointer-events-none" : ""}`}
          >
            <IconChevronDown className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Content with right sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-scroll scroll-stable">
          <div className="max-w-4xl mx-auto px-8 py-6">
            {/* Title */}
            <h1 className="text-2xl font-semibold mb-1">{lead.companyName}</h1>
            <p className="text-muted-foreground mb-6">
              {[lead.city, lead.state].filter(Boolean).join(", ")}
              {lead.industry && <span> &middot; {lead.industry}</span>}
            </p>

            {/* Research content */}
            <LeadResearchPanel
              lead={lead}
              companyResearch={companyProfile}
              people={peopleList}
              score={score}
            />

            {/* Activity section */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">Activity</h2>
              </div>
              <div className="space-y-3">
                {lead.researchedAt && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                      <IconCircleCheck className="w-3.5 h-3.5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Research completed</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {new Date(lead.researchedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                    <IconBuilding className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Lead created</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {new Date(lead.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comment input */}
              <div className="mt-6">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/10 bg-white/[0.02] text-sm text-muted-foreground focus-within:border-white/20">
                  <input
                    type="text"
                    placeholder="Leave a note..."
                    className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar - Company Properties */}
        <aside className="w-64 border-l border-white/5 overflow-y-scroll scroll-stable shrink-0">
          <div className="p-4">
            {/* Score Section */}
            <div className="mb-6 pb-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Score
                </h3>
                <RescoreButton leadId={leadId} companyName={lead.companyName} size="sm" />
              </div>
              <ScoreCard score={score} />
            </div>

            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Company
            </h3>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <div className="flex items-center gap-1.5 text-sm">
                  <StatusIcon className={`w-4 h-4 ${config.color}`} />
                  <span>{config.label}</span>
                </div>
              </div>

              {/* Industry */}
              {lead.industry && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Industry</div>
                  <span className="inline-flex px-2 py-0.5 rounded bg-white/5 text-xs">
                    {lead.industry}
                  </span>
                </div>
              )}

              {/* Location */}
              {(lead.city || lead.state || lead.country) && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Location</div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <IconMapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{[lead.city, lead.state, lead.country].filter(Boolean).join(", ")}</span>
                  </div>
                </div>
              )}

              {/* Employee Range */}
              {lead.employeeRange && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Size</div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <IconUsers className="w-4 h-4 text-muted-foreground" />
                    <span>{lead.employeeRange}</span>
                  </div>
                </div>
              )}

              {/* Revenue */}
              {lead.revenueRange && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Revenue</div>
                  <span className="text-sm">{lead.revenueRange}</span>
                </div>
              )}

              {/* Links */}
              <div className="border-t border-white/5 pt-4 mt-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Links
                </h4>
                <div className="space-y-2">
                  {lead.website && (
                    <a
                      href={
                        lead.website.startsWith("http") ? lead.website : `https://${lead.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <IconWorld className="w-4 h-4" />
                      <span className="truncate">{domain}</span>
                    </a>
                  )}
                  {lead.companyLinkedinUrl && (
                    <a
                      href={lead.companyLinkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <IconBrandLinkedin className="w-4 h-4" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Research date */}
              {lead.researchedAt && (
                <div className="border-t border-white/5 pt-4 mt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <IconCalendar className="w-3.5 h-3.5" />
                    <span>
                      Researched{" "}
                      {new Date(lead.researchedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
