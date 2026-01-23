"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { IconSearch, IconUsers, IconLoader2 } from "@tabler/icons-react";
import { AddPersonModal } from "@/components/people/add-person-modal";
import { PeopleListWithSelection } from "@/components/people/people-list-with-selection";
import { getAllPeople, getAllLeads } from "@/lib/tauri/commands";
import type { PersonWithCompany, Lead } from "@/lib/tauri/types";
import {
  PERSON_USER_STATUS_ORDER,
  type PersonUserStatusType,
  validatePersonUserStatus,
} from "@/lib/constants/status-config";

export default function PeoplePage() {
  const [groupedPeople, setGroupedPeople] = useState<Record<PersonUserStatusType, PersonWithCompany[]>>({} as Record<PersonUserStatusType, PersonWithCompany[]>);
  const [leads, setLeads] = useState<{ id: number; companyName: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [peopleData, leadsData] = await Promise.all([
        getAllPeople(),
        getAllLeads(),
      ]);

      // Group people by user status
      const grouped = PERSON_USER_STATUS_ORDER.reduce((acc, status) => {
        acc[status] = [];
        return acc;
      }, {} as Record<PersonUserStatusType, PersonWithCompany[]>);

      for (const person of peopleData) {
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
        grouped[status].push(personForList as PersonWithCompany);
      }

      setGroupedPeople(grouped);
      setLeads(leadsData.map((lead: Lead) => ({
        id: lead.id,
        companyName: lead.companyName,
      })));
    } catch (error) {
      console.error("Failed to fetch people:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <>
        <header className="h-10 border-b border-white/5 flex items-center px-3 gap-1">
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
      <header className="h-10 border-b border-white/5 flex items-center px-3 gap-1">
        <div className="flex items-center gap-1 px-2 py-1 bg-white/10 text-sm">
          <IconUsers className="w-3.5 h-3.5" />
          <span>All People</span>
        </div>
        <div className="flex-1" />
        <AddPersonModal leads={leads} />
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
