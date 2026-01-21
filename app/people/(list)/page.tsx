import { getPeopleGroupedByOwnStatus, getAllLeads } from "@/lib/db/queries";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  IconSearch,
  IconUsers,
  IconBuilding,
} from "@tabler/icons-react";
import { AddPersonModal } from "@/components/people/add-person-modal";
import { STATUS_CONFIG, STATUS_ORDER, type StatusType } from "@/lib/constants/status-config";
import { CollapsibleStatusGroup } from "@/components/ui/collapsible-status-group";

// Revalidate data every 30 seconds
export const revalidate = 30;

export default async function PeoplePage() {
  const [{ groupedPeople }, allLeads] = await Promise.all([
    getPeopleGroupedByOwnStatus(),
    getAllLeads(),
  ]);


  // Prepare leads for the dropdown (just id and companyName)
  const leadsForDropdown = allLeads.map((lead) => ({
    id: lead.id,
    companyName: lead.companyName,
  }));

  return (
    <>
      {/* Header tabs */}
      <header className="h-10 border-b border-white/5 flex items-center px-3 gap-1">
        <div className="flex items-center gap-1 px-2 py-1 bg-white/10 text-sm">
          <IconUsers className="w-3.5 h-3.5" />
          <span>All People</span>
        </div>
        <div className="flex-1" />
        <AddPersonModal leads={leadsForDropdown} />
      </header>

      {/* Filter bar */}
      <div className="h-9 border-b border-white/5 flex items-center px-3 gap-2">
        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground px-2">
          <IconSearch className="w-3.5 h-3.5 mr-1" />
          Filter
        </Button>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-auto">
        {STATUS_ORDER.map((status) => {
          const peopleInStatus = groupedPeople[status];
          if (!peopleInStatus || peopleInStatus.length === 0) return null;

          return (
            <CollapsibleStatusGroup
              key={status}
              status={status}
              count={peopleInStatus.length}
            >
              {peopleInStatus.map((person) => (
                <PersonRow key={person.id} person={person} />
              ))}
            </CollapsibleStatusGroup>
          );
        })}
      </div>
    </>
  );
}

type PersonWithCompany = {
  id: number;
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
  linkedinUrl: string | null;
  leadId: number;
  companyName: string;
  researchStatus: string | null;
};

function PersonRow({ person }: { person: PersonWithCompany }) {
  const status = (person.researchStatus || "pending") as StatusType;
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const fullName = `${person.firstName} ${person.lastName}`;

  return (
    <div className="group flex items-center gap-2 px-3 py-2 border-b border-white/5 hover:bg-white/[0.03] transition-colors text-sm">
      {/* Spacer to align with header toggle button */}
      <div className="w-4 shrink-0" />
      {/* Status icon - fixed width */}
      <StatusIcon className={`w-4 h-4 ${config.color} shrink-0`} />

      {/* Name and Title */}
      <Link href={`/people/${person.id}`} className="flex-1 min-w-0 truncate">
        <span className="font-medium">{fullName}</span>
        {person.title && <span className="text-muted-foreground ml-2">{person.title}</span>}
      </Link>

      {/* Company - fixed width */}
      <Link
        href={`/lead/${person.leadId}`}
        className="w-60 shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <IconBuilding className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{person.companyName}</span>
      </Link>
    </div>
  );
}
