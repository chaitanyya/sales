import { Button } from "@/components/ui/button";
import { IconSearch, IconBuilding } from "@tabler/icons-react";
import { AddLeadModal } from "@/components/leads/add-lead-modal";
import { LeadListWithSelection } from "@/components/leads/lead-list-with-selection";
import { useLeadsWithScores } from "@/lib/hooks/use-leads";
import type { LeadWithScore } from "@/lib/tauri/types";

// Helper to group leads by user status
function groupByUserStatus(leads: LeadWithScore[]) {
  const groups: Record<string, LeadWithScore[]> = {
    new: [],
    qualified: [],
    contacted: [],
    meeting: [],
    proposal: [],
    negotiating: [],
    won: [],
    lost: [],
    on_hold: [],
  };

  for (const lead of leads) {
    const status = lead.userStatus || "new";
    if (!groups[status]) groups[status] = [];
    groups[status].push(lead);
  }

  return groups;
}

// Helper to count leads by tier
function getTierCounts(leads: LeadWithScore[]) {
  const counts = {
    hot: 0,
    warm: 0,
    nurture: 0,
    disqualified: 0,
    unscored: 0,
  };

  for (const lead of leads) {
    if (lead.score) {
      counts[lead.score.tier]++;
    } else {
      counts.unscored++;
    }
  }

  return counts;
}

export default function LeadListPage() {
  const { leads, isLoading, refresh } = useLeadsWithScores();

  const groupedLeads = groupByUserStatus(leads);
  const tierCounts = getTierCounts(leads);

  if (isLoading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading leads...</p>
      </div>
    );
  }

  return (
    <>
      <header data-tauri-drag-region className="h-10 border-b border-white/5 flex items-center px-3 gap-1">
        <div className="flex items-center rounded gap-1 px-2 py-1 bg-white/10 text-sm">
          <IconBuilding className="w-3.5 h-3.5" />
          <span>All Companies</span>
        </div>
        <div className="flex-1" data-tauri-drag-region />
        <AddLeadModal onSuccess={refresh} />
      </header>

      <div className="h-9 border-b border-white/5 flex items-center px-3 gap-2">
        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground px-2">
          <IconSearch className="w-3.5 h-3.5 mr-1" />
          Filter
        </Button>
        <div className="flex-1" />
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

      <LeadListWithSelection groupedLeads={groupedLeads} onRefresh={refresh} />
    </>
  );
}
