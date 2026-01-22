import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLead, getAdjacentLeads, getPeopleForLead, getLeadScore } from "@/lib/db/queries";
import {
  IconBuilding,
  IconMapPin,
  IconBrandLinkedin,
  IconWorld,
  IconCalendar,
  IconUsers,
  IconCircleCheck,
} from "@tabler/icons-react";
import { LeadResearchPanel } from "@/components/lead/lead-research-panel";
import { ScoreCard } from "@/components/leads/score-bars";
import { UserStatusSelector } from "@/components/status/user-status-selector";
import { ResearchStatusBadge } from "@/components/status/research-status-badge";
import { validateLeadUserStatus } from "@/lib/constants/status-config";
import {
  EntityDetailLayout,
  ActivityItem,
  SidebarSection,
  SidebarProperty,
} from "@/components/layout/entity-detail-layout";

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

  const [adjacentLeads, peopleList, score] = await Promise.all([
    getAdjacentLeads(leadId),
    getPeopleForLead(leadId),
    getLeadScore(leadId),
  ]);

  const { companyProfile } = lead;
  const { prevLead, nextLead, currentIndex, total } = adjacentLeads;
  const userStatus = validateLeadUserStatus(lead.userStatus);

  const subtitle = (
    <>
      {[lead.city, lead.state].filter(Boolean).join(", ")}
      {lead.industry && <span> &middot; {lead.industry}</span>}
    </>
  );

  const activityContent = (
    <>
      {lead.researchedAt && (
        <ActivityItem
          icon={<IconCircleCheck className="w-3.5 h-3.5 text-green-500" />}
          iconBgColor="bg-green-500/20"
          label="Research completed"
          date={new Date(lead.researchedAt)}
        />
      )}
      <ActivityItem
        icon={<IconBuilding className="w-3.5 h-3.5 text-primary" />}
        iconBgColor="bg-primary/20"
        label="Lead created"
        date={new Date(lead.createdAt)}
      />
    </>
  );

  const sidebarContent = (
    <>
      <SidebarSection title="Status">
        <UserStatusSelector type="lead" entityId={lead.id} currentStatus={userStatus} />
      </SidebarSection>

      <SidebarSection title="Score">
        <ScoreCard score={score} />
      </SidebarSection>

      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Company
      </h3>

      <div className="space-y-4">
        <SidebarProperty label="Research">
          <ResearchStatusBadge status={lead.researchStatus} showLabel size="md" />
        </SidebarProperty>

        {lead.industry && (
          <SidebarProperty label="Industry">
            <span className="inline-flex px-2 py-0.5 rounded bg-white/5 text-xs">
              {lead.industry}
            </span>
          </SidebarProperty>
        )}

        {(lead.city || lead.state || lead.country) && (
          <SidebarProperty label="Location">
            <div className="flex items-center gap-1.5 text-sm">
              <IconMapPin className="w-4 h-4 text-muted-foreground" />
              <span>{[lead.city, lead.state, lead.country].filter(Boolean).join(", ")}</span>
            </div>
          </SidebarProperty>
        )}

        {lead.employeeRange && (
          <SidebarProperty label="Size">
            <div className="flex items-center gap-1.5 text-sm">
              <IconUsers className="w-4 h-4 text-muted-foreground" />
              <span>{lead.employeeRange}</span>
            </div>
          </SidebarProperty>
        )}

        {lead.revenueRange && (
          <SidebarProperty label="Revenue">
            <span className="text-sm">{lead.revenueRange}</span>
          </SidebarProperty>
        )}

        {(lead.website || lead.companyLinkedinUrl) && (
          <div className="border-t border-white/5 pt-4 mt-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Links
            </h4>
            <div className="space-y-2">
              {lead.website && (
                <a
                  href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
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
        )}

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
    </>
  );

  return (
    <EntityDetailLayout
      backHref="/lead"
      breadcrumbLabel="Leads"
      title={lead.companyName}
      subtitle={subtitle}
      prevUrl={prevLead ? `/lead/${prevLead.id}` : null}
      nextUrl={nextLead ? `/lead/${nextLead.id}` : null}
      currentIndex={currentIndex}
      totalItems={total}
      mainContent={
        <LeadResearchPanel
          lead={lead}
          companyResearch={companyProfile}
          people={peopleList}
          score={score}
        />
      }
      activityContent={activityContent}
      sidebarContent={sidebarContent}
    />
  );
}
