import { useQuery } from "@tanstack/react-query";
import { getCompanyProfile } from "@/lib/tauri/commands";
import { queryKeys } from "./keys";

/**
 * Fetches the user's company profile
 * Used in onboarding and settings
 */
export function useCompanyProfile() {
  return useQuery({
    queryKey: queryKeys.companyProfile(),
    queryFn: () => getCompanyProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes - profile doesn't change often
  });
}
