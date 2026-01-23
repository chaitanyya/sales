import { Button } from "@/components/ui/button";
import { IconSearch, IconUsers, IconLoader2 } from "@tabler/icons-react";
import { AddPersonModal } from "@/components/people/add-person-modal";
import { PeopleListWithSelection } from "@/components/people/people-list-with-selection";
import { useAllPeople, useLeadsForSelect } from "@/lib/hooks/use-people";
import type { PersonWithCompany } from "@/lib/tauri/types";
import {
  PERSON_USER_STATUS_ORDER,
  type PersonUserStatusType,
  validatePersonUserStatus,
} from "@/lib/constants/status-config";

export default function PeopleListPage() {
  const { people, isLoading, refresh } = useAllPeople();
  const { leads } = useLeadsForSelect();

  // Group people by user status
  const groupedPeople = PERSON_USER_STATUS_ORDER.reduce((acc, status) => {
    acc[status] = [];
    return acc;
  }, {} as Record<PersonUserStatusType, PersonWithCompany[]>);

  for (const person of people) {
    const status = validatePersonUserStatus(person.userStatus);
    // Create compatible object for PeopleListWithSelection
    const personForList = {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      title: person.title,
      email: person.email,
      linkedinUrl: person.linkedinUrl,
      leadId: person.leadId,
      companyName: person.companyName,
      researchStatus: person.researchStatus,
      userStatus: person.userStatus,
    };
    groupedPeople[status].push(personForList as PersonWithCompany);
  }

  if (isLoading && people.length === 0) {
    return (
      <>
        <header data-tauri-drag-region className="h-10 border-b border-white/5 flex items-center px-3 gap-1">
          <div className="flex items-center gap-1 px-2 py-1 bg-white/10 text-sm">
            <IconUsers className="w-3.5 h-3.5" />
            <span>All People</span>
          </div>
        </header>
        <div className="flex items-center justify-center h-64">
          <IconLoader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <header data-tauri-drag-region className="h-10 border-b border-white/5 flex items-center px-3 gap-1">
        <div className="flex items-center gap-1 px-2 py-1 bg-white/10 text-sm">
          <IconUsers className="w-3.5 h-3.5" />
          <span>All People</span>
        </div>
        <div className="flex-1" />
        <AddPersonModal leads={leads} onSuccess={refresh} />
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
