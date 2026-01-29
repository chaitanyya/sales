import { useCallback } from "react";
import { useCompanyProfile as useCompanyProfileQuery, useSaveCompanyProfile, useUpdateCompanyProfileResearchStatus } from "@/lib/query";
import { startCompanyProfileResearch } from "@/lib/tauri/commands";
import type { CompanyProfile, ParsedCompanyProfile } from "@/lib/tauri/types";
import { handleStreamEvent } from "@/lib/stream/handle-stream-event";

/**
 * Hook for fetching and managing the user's company profile.
 * Used in onboarding wizard and settings page.
 */
export function useCompanyProfile() {
  const { data, isLoading, error } = useCompanyProfileQuery();
  const saveMutation = useSaveCompanyProfile();
  const updateStatusMutation = useUpdateCompanyProfileResearchStatus();

  // Parse JSON fields if they exist
  const parsedData: ParsedCompanyProfile | null = data
    ? {
        ...data,
        targetAudience: parseJSONField(data.targetAudience) ?? [],
        usps: parseJSONField(data.usps) ?? [],
        marketingNarrative: data.marketingNarrative ?? "",
        salesNarrative: parseJSONField(data.salesNarrative) ?? { elevatorPitch: "", talkingPoints: [] },
        competitors: parseJSONField(data.competitors) ?? [],
        marketInsights: parseJSONField(data.marketInsights) ?? [],
      }
    : null;

  const saveProfile = useCallback(
    async (profile: Partial<ParsedCompanyProfile & { companyName?: string; productName?: string; website?: string }>) => {
      // Convert parsed fields back to JSON strings
      const params = {
        companyName: profile.companyName ?? parsedData?.companyName ?? "",
        productName: profile.productName ?? parsedData?.productName ?? "",
        website: profile.website ?? parsedData?.website ?? "",
        targetAudience: profile.targetAudience ? JSON.stringify(profile.targetAudience) : undefined,
        usps: profile.usps ? JSON.stringify(profile.usps) : undefined,
        marketingNarrative: profile.marketingNarrative,
        salesNarrative: profile.salesNarrative ? JSON.stringify(profile.salesNarrative) : undefined,
        competitors: profile.competitors ? JSON.stringify(profile.competitors) : undefined,
        marketInsights: profile.marketInsights ? JSON.stringify(profile.marketInsights) : undefined,
        rawAnalysis: parsedData?.rawAnalysis,
      };

      return saveMutation.mutateAsync(params);
    },
    [parsedData, saveMutation]
  );

  const startResearch = useCallback(
    async (companyName: string, productName: string, website: string) => {
      // Update status to in_progress
      await updateStatusMutation.mutateAsync("in_progress");

      try {
        // Start the AI research job
        return await startCompanyProfileResearch(companyName, productName, website, handleStreamEvent);
      } catch (error) {
        // Rollback status on failure
        await updateStatusMutation.mutateAsync("failed");
        throw error;
      }
    },
    [updateStatusMutation]
  );

  return {
    profile: parsedData,
    isLoading,
    error,
    saveProfile,
    startResearch,
    isSaving: saveMutation.isPending,
    isResearching: updateStatusMutation.isPending,
  };
}

// Helper to safely parse JSON fields
function parseJSONField<T>(jsonString: string | null): T | null {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
}
