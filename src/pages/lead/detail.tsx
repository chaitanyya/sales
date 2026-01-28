import { useParams, Navigate } from "react-router-dom";
import {
  IconBuilding,
  IconMapPin,
  IconBrandLinkedin,
  IconWorld,
  IconCalendar,
  IconUsers,
  IconCircleCheck,
  IconLoader2,
  IconPencil,
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
import { useLeadDetail } from "@/lib/hooks/use-leads";
import { useNotes } from "@/lib/hooks/use-notes";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const leadId = parseInt(id || "", 10);
  const { notes, addNote, updateNote, deleteNote } = useNotes("lead", leadId);

  const { lead, score, people, adjacentLeads, isLoading, error } = useLeadDetail(leadId);

  if (isNaN(leadId)) {
    return <Navigate to="/lead" replace />;
  }

  if (isLoading && !lead) {
    return (
      <div className="flex items-center justify-center h-screen">
        <IconLoader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !lead) {
    return <Navigate to="/lead" replace />;
  }

  const domain = lead.website?.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0] || null;
  const userStatus = validateLeadUserStatus(lead.userStatus);

  const subtitle = (
    <>
      {[lead.city, lead.state].filter(Boolean).join(", ")}
      {lead.industry && <span> &middot; {lead.industry}</span>}
    </>
  );

  const activityContent = (
    <>
      {notes.map((note) => (
        <ActivityItem
          key={note.id}
          icon={<IconPencil className="w-3.5 h-3.5 text-orange-500" />}
          iconBgColor="bg-orange-500/20"
          label={note.content}
          date={new Date(note.createdAt)}
          isEditable
          onEdit={async (content) => { await updateNote({ id: note.id, content }); }}
          onDelete={async () => { await deleteNote(note.id); }}
        />
      ))}
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
        <ScoreCard score={score ?? null} />
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
            <span className="inline-flex px-2 py-0.5 rounded bg-secondary/50 text-xs">
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
          <div className="border-t border-sidebar-border pt-4 mt-4">
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
          <div className="border-t border-sidebar-border pt-4 mt-4">
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
      prevUrl={adjacentLeads?.prevLead ? `/lead/${adjacentLeads.prevLead}` : null}
      nextUrl={adjacentLeads?.nextLead ? `/lead/${adjacentLeads.nextLead}` : null}
      currentIndex={adjacentLeads?.currentIndex ?? 0}
      totalItems={adjacentLeads?.total ?? 0}
      mainContent={
        <LeadResearchPanel
          lead={lead}
          companyResearch={lead.companyProfile}
          people={people}
          score={score}
        />
      }
      activityContent={activityContent}
      sidebarContent={sidebarContent}
      onAddNote={async (c) => { await addNote(c); }}
    />
  );
}
