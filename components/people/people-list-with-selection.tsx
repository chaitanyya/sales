"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconBuilding,
  IconTrash,
  IconSearch,
  IconMessage,
} from "@tabler/icons-react";
import { SelectableEntityList, SelectableRow } from "@/components/selection";
import type { ActionConfig } from "@/components/selection";
import { toast } from "sonner";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { useSelectionStore } from "@/lib/store/selection-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { deletePeople } from "@/app/actions/bulk";
import {
  PERSON_USER_STATUS_CONFIG,
  PERSON_USER_STATUS_ORDER,
  type PersonUserStatusType,
  validatePersonUserStatus,
} from "@/lib/constants/status-config";
import { ResearchStatusBadge } from "@/components/status/research-status-badge";
import { useMemo, useCallback } from "react";

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
  userStatus: string | null;
};

interface PeopleListWithSelectionProps {
  groupedPeople: Record<PersonUserStatusType, PersonWithCompany[]>;
}

export function PeopleListWithSelection({ groupedPeople }: PeopleListWithSelectionProps) {
  const router = useRouter();
  const addTab = useStreamPanelStore((state) => state.addTab);
  const clearSelection = useSelectionStore((state) => state.clearAll);
  const selectedModel = useSettingsStore((state) => state.selectedModel);

  // Create a map for quick person name lookups
  const personMap = useMemo(() => {
    const map = new Map<number, PersonWithCompany>();
    Object.values(groupedPeople)
      .flat()
      .forEach((person) => map.set(person.id, person));
    return map;
  }, [groupedPeople]);

  const handleResearch = useCallback(
    async (selectedIds: number[]) => {
      let started = 0;
      let failed = 0;

      // Start research for each selected person
      for (const personId of selectedIds) {
        const person = personMap.get(personId);
        if (!person) continue;

        const fullName = `${person.firstName} ${person.lastName}`;

        try {
          const response = await fetch("/api/research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personId, model: selectedModel }),
          });

          if (response.ok) {
            const data = await response.json();
            addTab({
              jobId: data.jobId,
              label: fullName,
              type: "person",
              entityId: personId,
              status: "running",
            });
            started++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Failed to start research for person ${personId}:`, error);
          failed++;
        }
      }

      if (started > 0) {
        toast.success(`Started research for ${started} ${started > 1 ? "people" : "person"}`);
      }
      if (failed > 0) {
        toast.error(`Failed to start research for ${failed} ${failed > 1 ? "people" : "person"}`);
      }
    },
    [personMap, addTab, selectedModel]
  );

  const handleConversation = useCallback(
    async (selectedIds: number[]) => {
      let started = 0;
      let failed = 0;

      // Generate conversation for each selected person
      for (const personId of selectedIds) {
        const person = personMap.get(personId);
        if (!person) continue;

        const fullName = `${person.firstName} ${person.lastName}`;

        try {
          const response = await fetch("/api/conversation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personId }),
          });

          if (response.ok) {
            const data = await response.json();
            addTab({
              jobId: data.jobId,
              label: `Conv: ${fullName}`,
              type: "conversation",
              entityId: personId,
              status: "running",
            });
            started++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Failed to start conversation generation for person ${personId}:`, error);
          failed++;
        }
      }

      if (started > 0) {
        toast.success(`Started conversation generation for ${started} ${started > 1 ? "people" : "person"}`);
      }
      if (failed > 0) {
        toast.error(`Failed to generate conversations for ${failed} ${failed > 1 ? "people" : "person"}`);
      }
    },
    [personMap, addTab]
  );

  const handleDelete = useCallback(
    async (selectedIds: number[]) => {
      if (!confirm(`Delete ${selectedIds.length} person(s)? This action cannot be undone.`)) {
        return;
      }

      try {
        const result = await deletePeople(selectedIds);
        clearSelection();
        router.refresh();
        toast.success(`Deleted ${result.deleted} ${result.deleted > 1 ? "people" : "person"}`);
      } catch (error) {
        console.error("Failed to delete people:", error);
        toast.error("Failed to delete people");
      }
    },
    [clearSelection, router]
  );

  const actions: ActionConfig[] = useMemo(
    () => [
      {
        id: "research",
        label: "Run Research",
        icon: IconSearch,
        group: "Research",
        onExecute: handleResearch,
      },
      {
        id: "conversation",
        label: "Generate Conversation",
        icon: IconMessage,
        group: "Research",
        onExecute: handleConversation,
      },
      {
        id: "delete",
        label: "Delete",
        icon: IconTrash,
        group: "Danger",
        destructive: true,
        onExecute: handleDelete,
      },
    ],
    [handleResearch, handleConversation, handleDelete]
  );

  return (
    <SelectableEntityList
      entityType="person"
      groupedItems={groupedPeople}
      statusOrder={PERSON_USER_STATUS_ORDER}
      configType="person_user"
      getItemId={(person) => person.id}
      renderRow={(person) => <PersonRow person={person} />}
      actions={actions}
    />
  );
}

function PersonRow({ person }: { person: PersonWithCompany }) {
  const userStatus = validatePersonUserStatus(person.userStatus);
  const userConfig = PERSON_USER_STATUS_CONFIG[userStatus];
  const StatusIcon = userConfig.icon;

  const fullName = `${person.firstName} ${person.lastName}`;

  return (
    <SelectableRow id={person.id}>
      <StatusIcon className={`w-4 h-4 ${userConfig.color} shrink-0`} />

      <Link href={`/people/${person.id}`} className="flex-1 min-w-0 truncate">
        <span className="font-medium">{fullName}</span>
        {person.title && <span className="text-muted-foreground ml-2">{person.title}</span>}
      </Link>

      <Link
        href={`/lead/${person.leadId}`}
        className="w-48 shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <IconBuilding className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{person.companyName}</span>
      </Link>

      <ResearchStatusBadge status={person.researchStatus} size="sm" />
    </SelectableRow>
  );
}
