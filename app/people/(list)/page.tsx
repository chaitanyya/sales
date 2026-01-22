import { getPeopleGroupedByUserStatus, getAllLeads } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import {
  IconSearch,
  IconUsers,
} from "@tabler/icons-react";
import { AddPersonModal } from "@/components/people/add-person-modal";
import { PeopleListWithSelection } from "@/components/people/people-list-with-selection";

// Revalidate data every 30 seconds
export const revalidate = 30;

export default async function PeoplePage() {
  const [{ groupedPeople }, allLeads] = await Promise.all([
    getPeopleGroupedByUserStatus(),
    getAllLeads(),
  ]);


  // Prepare leads for the dropdown (just id and companyName)
  const leadsForDropdown = allLeads.map((lead) => ({
    id: lead.id,
    companyName: lead.companyName,
  }));

  return (
    <>
      <header className="h-10 border-b border-white/5 flex items-center px-3 gap-1">
        <div className="flex items-center gap-1 px-2 py-1 bg-white/10 text-sm">
          <IconUsers className="w-3.5 h-3.5" />
          <span>All People</span>
        </div>
        <div className="flex-1" />
        <AddPersonModal leads={leadsForDropdown} />
      </header>

      <div className="h-9 border-b border-white/5 flex items-center px-3 gap-2">
        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground px-2">
          <IconSearch className="w-3.5 h-3.5 mr-1" />
          Filter
        </Button>
      </div>

      <PeopleListWithSelection groupedPeople={groupedPeople} />
    </>
  );
}
