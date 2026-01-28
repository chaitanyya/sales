import { useMutation } from "@tanstack/react-query";
import {
  insertLead,
  updateLeadUserStatus,
  deleteLeads,
} from "@/lib/tauri/commands";
import type { NewLead, Lead, LeadWithScore } from "@/lib/tauri/types";
import { queryClient } from "./query-client";
import { queryKeys } from "./keys";

/**
 * Insert a new lead
 * Note: Event bridge handles cache invalidation via lead-created event
 */
export function useInsertLead() {
  return useMutation({
    mutationFn: (data: NewLead) => {
      return insertLead(data);
    },
    // No onSuccess - event bridge handles invalidation
  });
}

/**
 * Update lead user status with optimistic update
 */
export function useUpdateLeadStatus() {
  return useMutation({
    mutationFn: ({ leadId, status }: { leadId: number; status: string }) => {
      return updateLeadUserStatus(leadId, status);
    },
    onMutate: async ({ leadId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.lead(leadId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.leadsWithScores() });

      // Snapshot previous values
      const previousLead = queryClient.getQueryData<Lead | null>(
        queryKeys.lead(leadId)
      );
      const previousLeads = queryClient.getQueryData<LeadWithScore[]>(
        queryKeys.leadsWithScores()
      );

      // Optimistically update individual lead
      queryClient.setQueryData<Lead | null>(
        queryKeys.lead(leadId),
        (old) => (old ? { ...old, userStatus: status } : old)
      );

      // Optimistically update leads list
      queryClient.setQueryData<LeadWithScore[]>(
        queryKeys.leadsWithScores(),
        (old) =>
          old?.map((lead) =>
            lead.id === leadId ? { ...lead, userStatus: status } : lead
          )
      );

      return { previousLead, previousLeads };
    },
    onError: (_err, { leadId }, context) => {
      // Rollback on error
      if (context?.previousLead !== undefined) {
        queryClient.setQueryData(queryKeys.lead(leadId), context.previousLead);
      }
      if (context?.previousLeads !== undefined) {
        queryClient.setQueryData(
          queryKeys.leadsWithScores(),
          context.previousLeads
        );
      }
    },
  });
}

/**
 * Delete leads with optimistic update
 */
export function useDeleteLeads() {
  return useMutation({
    mutationFn: (leadIds: number[]) => {
      return deleteLeads(leadIds);
    },
    onMutate: async (leadIds) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.leadsWithScores() });

      // Snapshot previous value
      const previousLeads = queryClient.getQueryData<LeadWithScore[]>(
        queryKeys.leadsWithScores()
      );

      // Optimistically remove from list
      queryClient.setQueryData<LeadWithScore[]>(
        queryKeys.leadsWithScores(),
        (old) => old?.filter((lead) => !leadIds.includes(lead.id))
      );

      return { previousLeads };
    },
    onError: (_err, _leadIds, context) => {
      // Rollback on error
      if (context?.previousLeads !== undefined) {
        queryClient.setQueryData(
          queryKeys.leadsWithScores(),
          context.previousLeads
        );
      }
    },
    onSettled: () => {
      // Invalidate to ensure consistency
      // Note: Event bridge also handles this via lead-deleted event
      queryClient.invalidateQueries({ queryKey: queryKeys.leadsWithScores() });
    },
  });
}
