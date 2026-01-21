import { getPeopleGroupedByOwnStatus, getAllLeads } from "@/lib/db/queries";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  IconSearch,
  IconUsers,
  IconChevronDown,
  IconPlus,
  IconBuilding,
} from "@tabler/icons-react";
import { AddPersonModal } from "@/components/people/add-person-modal";
import { STATUS_CONFIG, STATUS_ORDER, StatusType } from "@/lib/constants/status-config";

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

          const config = STATUS_CONFIG[status];
          const StatusIcon = config.icon;

          return (
            <div key={status}>
              {/* Status group header */}
              <div className="sticky top-0 bg-black/95 backdrop-blur-sm z-10 flex items-center gap-2 px-3 py-1.5 text-sm border-b border-white/5">
                <button className="p-0.5 hover:bg-white/10 rounded">
                  <IconChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                <StatusIcon className={`w-4 h-4 ${config.color}`} />
                <span className="font-medium">{config.label}</span>
                <span className="text-muted-foreground text-xs">{peopleInStatus.length}</span>
                <div className="flex-1" />
                <button className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100">
                  <IconPlus className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              {/* Person rows */}
              {peopleInStatus.map((person) => (
                <PersonRow key={person.id} person={person} />
              ))}
            </div>
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
    <div className="group flex items-center gap-3 px-3 py-1.5 border-b border-white/5 hover:bg-white/[0.03] transition-colors text-sm">
      {/* Status icon - fixed width */}
      <div className="w-4 shrink-0">
        <StatusIcon className={`w-4 h-4 ${config.color}`} />
      </div>

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
