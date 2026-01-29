import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveCompanyProfile, updateCompanyProfileResearchStatus } from "@/lib/tauri/commands";
import { queryKeys } from "./keys";
import type { CompanyProfile } from "@/lib/tauri/types";

/**
 * Saves the user's company profile
 */
export function useSaveCompanyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      companyName: string;
      productName: string;
      website: string;
      targetAudience?: string;
      usps?: string;
      marketingNarrative?: string;
      salesNarrative?: string;
      competitors?: string;
      marketInsights?: string;
      rawAnalysis?: string;
      researchStatus?: string;
    }) => saveCompanyProfile(params),
    onSuccess: () => {
      // Invalidate company profile query
      queryClient.invalidateQueries({ queryKey: queryKeys.companyProfile() });
      // Invalidate onboarding status
      queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus() });
    },
  });
}

/**
 * Updates the company profile research status
 */
export function useUpdateCompanyProfileResearchStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (researchStatus: string) => updateCompanyProfileResearchStatus(researchStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companyProfile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.onboardingStatus() });
    },
  });
}
