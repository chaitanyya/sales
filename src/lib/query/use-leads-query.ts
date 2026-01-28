import { useQuery } from "@tanstack/react-query";
import {
  getLeadsWithScores,
  getLead,
  getLeadScore,
  getPeopleForLead,
  getAdjacentLeads,
  getAllLeads,
} from "@/lib/tauri/commands";
import { queryKeys } from "./keys";
import { useAuthStore } from "@/lib/store/auth-store";

/**
 * List view - fetches all leads with their scores
 */
export function useLeadsWithScores() {
  const clerkOrgId = useAuthStore((state) => state.getCurrentOrgId());
  return useQuery({
    queryKey: queryKeys.leadsWithScores(clerkOrgId),
    queryFn: () => getLeadsWithScores(clerkOrgId),
    enabled: !!clerkOrgId,
  });
}

/**
 * Detail view - fetches a single lead by ID
 */
export function useLead(id: number) {
  const clerkOrgId = useAuthStore((state) => state.getCurrentOrgId());
  return useQuery({
    queryKey: queryKeys.lead(id, clerkOrgId),
    queryFn: () => getLead(id, clerkOrgId),
    enabled: id > 0 && !!clerkOrgId,
  });
}

/**
 * Fetches the score for a specific lead
 */
export function useLeadScore(id: number) {
  const clerkOrgId = useAuthStore((state) => state.getCurrentOrgId());
  return useQuery({
    queryKey: queryKeys.leadScore(id, clerkOrgId),
    queryFn: () => getLeadScore(id, clerkOrgId),
    enabled: id > 0 && !!clerkOrgId,
  });
}

/**
 * Fetches people associated with a lead
 */
export function useLeadPeople(leadId: number) {
  const clerkOrgId = useAuthStore((state) => state.getCurrentOrgId());
  return useQuery({
    queryKey: queryKeys.leadPeople(leadId, clerkOrgId),
    queryFn: () => getPeopleForLead(leadId, clerkOrgId),
    enabled: leadId > 0 && !!clerkOrgId,
  });
}

/**
 * Fetches adjacent leads for navigation
 */
export function useAdjacentLeads(id: number) {
  const clerkOrgId = useAuthStore((state) => state.getCurrentOrgId());
  return useQuery({
    queryKey: queryKeys.leadAdjacent(id, clerkOrgId),
    queryFn: () => getAdjacentLeads(id, clerkOrgId),
    enabled: id > 0 && !!clerkOrgId,
  });
}

/**
 * Fetches all leads (simplified, for select dropdowns)
 */
export function useLeadsForSelect() {
  const clerkOrgId = useAuthStore((state) => state.getCurrentOrgId());
  return useQuery({
    queryKey: queryKeys.leadsForSelect(clerkOrgId),
    queryFn: async () => {
      const leads = await getAllLeads(clerkOrgId);
      return leads.map((lead) => ({
        id: lead.id,
        companyName: lead.companyName,
      }));
    },
    enabled: !!clerkOrgId,
  });
}
