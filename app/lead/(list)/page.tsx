import { leads } from "@/db";
import { getLeadsGroupedByStatusWithScores } from "@/lib/db/queries";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  IconSearch,
  IconBuilding,
  IconChevronRight,
} from "@tabler/icons-react";
import { ScoreBars } from "@/components/leads/score-bars";
import { ScoreLeadsButton } from "@/components/leads/score-leads-button";
import { AddLeadModal } from "@/components/leads/add-lead-modal";
import type { ParsedLeadScore } from "@/lib/types/scoring";
import { STATUS_CONFIG, STATUS_ORDER, type StatusType } from "@/lib/constants/status-config";
import { CollapsibleStatusGroup } from "@/components/ui/collapsible-status-group";

// Revalidate data every 30 seconds
export const revalidate = 30;

export default async function Page() {
  const { groupedLeads, tierCounts, counts } = await getLeadsGroupedByStatusWithScores();


  return (
    <>
      {/* Header tabs */}
      <header className="h-10 border-b border-white/5 flex items-center px-3 gap-1">
        <div className="flex items-center gap-1 px-2 py-1 bg-white/10 text-sm">
          <IconBuilding className="w-3.5 h-3.5" />
          <span>All Companies</span>
        </div>
        <div className="flex-1" />
        <AddLeadModal />
        <ScoreLeadsButton unscoredCount={tierCounts.unscored} totalCount={counts.all} />
      </header>

      {/* Filter bar */}
      <div className="h-9 border-b border-white/5 flex items-center px-3 gap-2">
        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground px-2">
          <IconSearch className="w-3.5 h-3.5 mr-1" />
          Filter
        </Button>
        <div className="flex-1" />
        {/* Tier counts */}
        <div className="flex items-center gap-2 text-xs">
          {tierCounts.hot > 0 && <span className="text-green-500">Hot: {tierCounts.hot}</span>}
          {tierCounts.warm > 0 && <span className="text-orange-500">Warm: {tierCounts.warm}</span>}
          {tierCounts.nurture > 0 && (
            <span className="text-orange-400">Nurture: {tierCounts.nurture}</span>
          )}
          {tierCounts.disqualified > 0 && (
            <span className="text-red-500">DQ: {tierCounts.disqualified}</span>
          )}
        </div>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-auto">
        {STATUS_ORDER.map((status) => {
          const leadsInStatus = groupedLeads[status];
          if (!leadsInStatus || leadsInStatus.length === 0) return null;

          return (
            <CollapsibleStatusGroup
              key={status}
              status={status}
              count={leadsInStatus.length}
            >
              {leadsInStatus.map((lead) => (
                <LeadRow key={lead.id} lead={lead} score={lead.score} />
              ))}
            </CollapsibleStatusGroup>
          );
        })}
      </div>
    </>
  );
}

function LeadRow({
  lead,
  score,
}: {
  lead: typeof leads.$inferSelect;
  score: ParsedLeadScore | null;
}) {
  const status = (lead.researchStatus || "pending") as StatusType;
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  // Format location
  const location = [lead.city, lead.state].filter(Boolean).join(", ");

  // Get clean domain from website
  const domain = lead.website?.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0] || null;

  return (
    <div className="group flex items-center gap-2 px-3 py-2 border-b border-white/5 hover:bg-white/[0.03] transition-colors text-sm">
      {/* Spacer to align with header toggle button */}
      <div className="w-4 shrink-0" />
      {/* Status icon */}
      <StatusIcon className={`w-4 h-4 ${config.color} shrink-0`} />

      {/* Company > Location - Website */}
      <Link href={`/lead/${lead.id}`} className="flex-1 min-w-0 flex items-center gap-1.5">
        {lead.companyName && (
          <>
            <span className="font-medium truncate">{lead.companyName}</span>
            <IconChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          </>
        )}
        <span className="truncate text-muted-foreground">
          {location || "Unknown location"}
          {domain && <span className="text-muted-foreground/70"> - {domain}</span>}
        </span>
      </Link>

      {/* Metadata */}
      <div className="flex items-center gap-2 shrink-0">
        {lead.industry && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">
            {lead.industry}
          </span>
        )}

        {/* Score bars */}
        <ScoreBars score={score} size="sm" />
      </div>
    </div>
  );
}
