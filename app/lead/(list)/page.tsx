import { getLeadsGroupedByUserStatusWithScores } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import {
  IconSearch,
  IconBuilding,
} from "@tabler/icons-react";
import { AddLeadModal } from "@/components/leads/add-lead-modal";
import { LeadListWithSelection } from "@/components/leads/lead-list-with-selection";

// Revalidate data every 30 seconds
export const revalidate = 30;

export default async function Page() {
  const { groupedLeads, tierCounts, allLeads } = await getLeadsGroupedByUserStatusWithScores();


  return (
    <>
      <header className="h-10 border-b border-white/5 flex items-center px-3 gap-1">
        <div className="flex items-center gap-1 px-2 py-1 bg-white/10 text-sm">
          <IconBuilding className="w-3.5 h-3.5" />
          <span>All Companies</span>
        </div>
        <div className="flex-1" />
        <AddLeadModal />
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

      <LeadListWithSelection groupedLeads={groupedLeads} />
    </>
  );
}
