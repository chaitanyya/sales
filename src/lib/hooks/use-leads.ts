import { useCallback } from "react";
import {
  useLeadsWithScores as useLeadsWithScoresQuery,
  useLead,
  useLeadScore,
  useLeadPeople,
  useAdjacentLeads,
  useInsertLead,
  useUpdateLeadStatus,
  useDeleteLeads as useDeleteLeadsMutation,
} from "@/lib/query";
import type { Lead, LeadScore, Person, AdjacentResult, NewLead } from "@/lib/tauri/types";

/**
 * Hook for the leads list page.
 * Returns leads with scores and loading state.
 * Now powered by TanStack Query.
 */
export function useLeadsWithScores() {
  const { data, isLoading, refetch } = useLeadsWithScoresQuery();

  return {
    leads: data ?? [],
    isLoading,
    refresh: refetch,
  };
}

/**
 * Hook for a single lead detail page.
 * Returns lead, score, people, and adjacent navigation.
 * Now powered by TanStack Query.
 */
export function useLeadDetail(leadId: number): {
  lead: Lead | undefined;
  score: LeadScore | undefined;
  people: Person[];
  adjacentLeads: AdjacentResult | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
} {
  const leadQuery = useLead(leadId);
  const scoreQuery = useLeadScore(leadId);
  const peopleQuery = useLeadPeople(leadId);
  const adjacentQuery = useAdjacentLeads(leadId);

  const isLoading =
    leadQuery.isLoading || scoreQuery.isLoading || peopleQuery.isLoading || adjacentQuery.isLoading;

  const error = leadQuery.error || scoreQuery.error || peopleQuery.error || adjacentQuery.error;

  const refresh = useCallback(async () => {
    await Promise.all([
      leadQuery.refetch(),
      scoreQuery.refetch(),
      peopleQuery.refetch(),
      adjacentQuery.refetch(),
    ]);
  }, [leadQuery, scoreQuery, peopleQuery, adjacentQuery]);

  return {
    lead: leadQuery.data ?? undefined,
    score: scoreQuery.data ?? undefined,
    people: peopleQuery.data ?? [],
    adjacentLeads: adjacentQuery.data ?? undefined,
    isLoading,
    error: error as Error | undefined,
    refresh,
  };
}

/**
 * Hook for lead mutations.
 * Returns mutation functions for updating and deleting leads.
 * Now powered by TanStack Query.
 */
export function useLeadMutations() {
  const insertLeadMutation = useInsertLead();
  const updateLeadStatusMutation = useUpdateLeadStatus();
  const deleteLeadsMutation = useDeleteLeadsMutation();

  const insertLead = useCallback(
    async (data: NewLead): Promise<number> => {
      return insertLeadMutation.mutateAsync(data);
    },
    [insertLeadMutation]
  );

  const updateLeadUserStatus = useCallback(
    async (leadId: number, status: string): Promise<void> => {
      await updateLeadStatusMutation.mutateAsync({ leadId, status });
    },
    [updateLeadStatusMutation]
  );

  const deleteLeads = useCallback(
    async (leadIds: number[]): Promise<void> => {
      await deleteLeadsMutation.mutateAsync(leadIds);
    },
    [deleteLeadsMutation]
  );

  return {
    insertLead,
    updateLeadUserStatus,
    deleteLeads,
  };
}
