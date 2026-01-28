import { useMutation } from "@tanstack/react-query";
import {
  insertLead,
  updateLeadUserStatus,
  deleteLeads,
} from "@/lib/tauri/commands";
import type { NewLead, Lead, LeadWithScore } from "@/lib/tauri/types";
import { queryClient } from "./query-client";
import { queryKeys } from "./keys";
import { useAuthStore } from "@/lib/store/auth-store";

/**
 * Insert a new lead
 * Note: Event bridge handles cache invalidation via lead-created event
 */
export function useInsertLead() {
  return useMutation({
    mutationFn: (data: NewLead) => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();
      if (!clerkOrgId) {
        throw new Error("Cannot create lead: No organization selected");
      }
      return insertLead(data, clerkOrgId);
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
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();
      if (!clerkOrgId) {
        throw new Error("Cannot update lead: No organization selected");
      }
      return updateLeadUserStatus(leadId, status, clerkOrgId);
    },
    onMutate: async ({ leadId, status }) => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.lead(leadId, clerkOrgId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.leadsWithScores(clerkOrgId) });

      // Snapshot previous values
      const previousLead = queryClient.getQueryData<Lead | null>(
        queryKeys.lead(leadId, clerkOrgId)
      );
      const previousLeads = queryClient.getQueryData<LeadWithScore[]>(
        queryKeys.leadsWithScores(clerkOrgId)
      );

      // Optimistically update individual lead
      queryClient.setQueryData<Lead | null>(
        queryKeys.lead(leadId, clerkOrgId),
        (old) => (old ? { ...old, userStatus: status } : old)
      );

      // Optimistically update leads list
      queryClient.setQueryData<LeadWithScore[]>(
        queryKeys.leadsWithScores(clerkOrgId),
        (old) =>
          old?.map((lead) =>
            lead.id === leadId ? { ...lead, userStatus: status } : lead
          )
      );

      return { previousLead, previousLeads };
    },
    onError: (_err, { leadId }, context) => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();
      // Rollback on error
      if (context?.previousLead !== undefined) {
        queryClient.setQueryData(queryKeys.lead(leadId, clerkOrgId), context.previousLead);
      }
      if (context?.previousLeads !== undefined) {
        queryClient.setQueryData(
          queryKeys.leadsWithScores(clerkOrgId),
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
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();
      if (!clerkOrgId) {
        throw new Error("Cannot delete leads: No organization selected");
      }
      return deleteLeads(leadIds, clerkOrgId);
    },
    onMutate: async (leadIds) => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.leadsWithScores(clerkOrgId) });

      // Snapshot previous value
      const previousLeads = queryClient.getQueryData<LeadWithScore[]>(
        queryKeys.leadsWithScores(clerkOrgId)
      );

      // Optimistically remove from list
      queryClient.setQueryData<LeadWithScore[]>(
        queryKeys.leadsWithScores(clerkOrgId),
        (old) => old?.filter((lead) => !leadIds.includes(lead.id))
      );

      return { previousLeads };
    },
    onError: (_err, _leadIds, context) => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();
      // Rollback on error
      if (context?.previousLeads !== undefined) {
        queryClient.setQueryData(
          queryKeys.leadsWithScores(clerkOrgId),
          context.previousLeads
        );
      }
    },
    onSettled: () => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();
      // Invalidate to ensure consistency
      // Note: Event bridge also handles this via lead-deleted event
      queryClient.invalidateQueries({ queryKey: queryKeys.leadsWithScores(clerkOrgId) });
    },
  });
}
