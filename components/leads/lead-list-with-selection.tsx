"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconChevronRight, IconSearch, IconTrash, IconChartBar } from "@tabler/icons-react";
import { SelectableEntityList, SelectableRow } from "@/components/selection";
import type { ActionConfig } from "@/components/selection";
import { ScoreBars } from "@/components/leads/score-bars";
import { ResearchStatusBadge } from "@/components/status/research-status-badge";
import { toast } from "sonner";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { useSelectionStore } from "@/lib/store/selection-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { deleteLeads } from "@/app/actions/bulk";
import type { ParsedLeadScore } from "@/lib/types/scoring";
import {
  LEAD_USER_STATUS_CONFIG,
  LEAD_USER_STATUS_ORDER,
  type LeadUserStatusType,
  validateLeadUserStatus,
} from "@/lib/constants/status-config";

type LeadWithScore = {
  id: number;
  companyName: string;
  city: string | null;
  state: string | null;
  website: string | null;
  industry: string | null;
  researchStatus: string | null;
  userStatus: string | null;
  score: ParsedLeadScore | null;
};

interface LeadListWithSelectionProps {
  groupedLeads: Record<LeadUserStatusType, LeadWithScore[]>;
}

export function LeadListWithSelection({ groupedLeads }: LeadListWithSelectionProps) {
  const router = useRouter();
  const addTab = useStreamPanelStore((state) => state.addTab);
  const clearSelection = useSelectionStore((state) => state.clearAll);
  const selectedModel = useSettingsStore((state) => state.selectedModel);

  // Create a map for quick lead name lookups
  const leadMap = React.useMemo(() => {
    const map = new Map<number, LeadWithScore>();
    Object.values(groupedLeads)
      .flat()
      .forEach((lead) => map.set(lead.id, lead));
    return map;
  }, [groupedLeads]);

  const handleResearch = React.useCallback(
    async (selectedIds: number[]) => {
      let started = 0;
      let failed = 0;

      // Start research for each selected lead
      for (const leadId of selectedIds) {
        const lead = leadMap.get(leadId);
        if (!lead) continue;

        try {
          const response = await fetch("/api/research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leadId, model: selectedModel }),
          });

          if (response.ok) {
            const data = await response.json();
            addTab({
              jobId: data.jobId,
              label: lead.companyName,
              type: "company",
              entityId: leadId,
              status: "running",
            });
            started++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Failed to start research for lead ${leadId}:`, error);
          failed++;
        }
      }

      if (started > 0) {
        toast.success(`Started research for ${started} lead${started > 1 ? "s" : ""}`);
      }
      if (failed > 0) {
        toast.error(`Failed to start research for ${failed} lead${failed > 1 ? "s" : ""}`);
      }
    },
    [leadMap, addTab, selectedModel]
  );

  const handleScore = React.useCallback(
    async (selectedIds: number[]) => {
      let started = 0;
      let failed = 0;

      // Score leads sequentially
      for (const leadId of selectedIds) {
        const lead = leadMap.get(leadId);
        if (!lead) continue;

        try {
          const response = await fetch("/api/scoring", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leadId, mode: "single", model: selectedModel }),
          });

          if (response.ok) {
            const data = await response.json();
            addTab({
              jobId: data.jobId,
              label: `Score: ${lead.companyName}`,
              type: "company",
              entityId: leadId,
              status: "running",
            });
            started++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Failed to start scoring for lead ${leadId}:`, error);
          failed++;
        }
      }

      if (started > 0) {
        toast.success(`Started scoring for ${started} lead${started > 1 ? "s" : ""}`);
      }
      if (failed > 0) {
        toast.error(`Failed to start scoring for ${failed} lead${failed > 1 ? "s" : ""}`);
      }
    },
    [leadMap, addTab, selectedModel]
  );

  const handleDelete = React.useCallback(
    async (selectedIds: number[]) => {
      if (!confirm(`Delete ${selectedIds.length} lead(s)? This action cannot be undone.`)) {
        return;
      }

      try {
        const result = await deleteLeads(selectedIds);
        clearSelection();
        router.refresh();
        toast.success(`Deleted ${result.deleted} lead${result.deleted > 1 ? "s" : ""}`);
      } catch (error) {
        console.error("Failed to delete leads:", error);
        toast.error("Failed to delete leads");
      }
    },
    [clearSelection, router]
  );

  const actions: ActionConfig[] = React.useMemo(
    () => [
      {
        id: "research",
        label: "Run Research",
        icon: IconSearch,
        group: "Research",
        onExecute: handleResearch,
      },
      {
        id: "score",
        label: "Score Leads",
        icon: IconChartBar,
        group: "Research",
        onExecute: handleScore,
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
    [handleResearch, handleScore, handleDelete]
  );

  return (
    <SelectableEntityList
      entityType="lead"
      groupedItems={groupedLeads}
      statusOrder={LEAD_USER_STATUS_ORDER}
      configType="lead_user"
      getItemId={(lead) => lead.id}
      renderRow={(lead) => <LeadRow lead={lead} />}
      actions={actions}
    />
  );
}

function LeadRow({ lead }: { lead: LeadWithScore }) {
  const userStatus = validateLeadUserStatus(lead.userStatus);
  const userConfig = LEAD_USER_STATUS_CONFIG[userStatus];
  const StatusIcon = userConfig.icon;

  const location = [lead.city, lead.state].filter(Boolean).join(", ");
  const domain = lead.website?.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0] || null;

  return (
    <SelectableRow id={lead.id}>
      <StatusIcon className={`w-4 h-4 ${userConfig.color} shrink-0`} />

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

      <div className="flex items-center gap-2 shrink-0">
        {lead.industry && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">
            {lead.industry}
          </span>
        )}
        <ScoreBars score={lead.score} size="sm" />
        <ResearchStatusBadge status={lead.researchStatus} size="sm" />
      </div>
    </SelectableRow>
  );
}
