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

/**
 * List view - fetches all leads with their scores
 */
export function useLeadsWithScores() {
  return useQuery({
    queryKey: queryKeys.leadsWithScores(),
    queryFn: () => getLeadsWithScores(),
  });
}

/**
 * Detail view - fetches a single lead by ID
 */
export function useLead(id: number) {
  return useQuery({
    queryKey: queryKeys.lead(id),
    queryFn: () => getLead(id),
    enabled: id > 0,
  });
}

/**
 * Fetches the score for a specific lead
 */
export function useLeadScore(id: number) {
  return useQuery({
    queryKey: queryKeys.leadScore(id),
    queryFn: () => getLeadScore(id),
    enabled: id > 0,
  });
}

/**
 * Fetches people associated with a lead
 */
export function useLeadPeople(leadId: number) {
  return useQuery({
    queryKey: queryKeys.leadPeople(leadId),
    queryFn: () => getPeopleForLead(leadId),
    enabled: leadId > 0,
  });
}

/**
 * Fetches adjacent leads for navigation
 */
export function useAdjacentLeads(id: number) {
  return useQuery({
    queryKey: queryKeys.leadAdjacent(id),
    queryFn: () => getAdjacentLeads(id),
    enabled: id > 0,
  });
}

/**
 * Fetches all leads (simplified, for select dropdowns)
 */
export function useLeadsForSelect() {
  return useQuery({
    queryKey: queryKeys.leadsForSelect(),
    queryFn: async () => {
      const leads = await getAllLeads();
      return leads.map((lead) => ({
        id: lead.id,
        companyName: lead.companyName,
      }));
    },
  });
}
