import { useQuery } from "@tanstack/react-query";
import { getOnboardingStatus } from "@/lib/tauri/commands";
import { queryKeys } from "./keys";

/**
 * Fetches onboarding status
 * Used to check which onboarding steps have been completed
 */
export function useOnboardingStatus() {
  return useQuery({
    queryKey: queryKeys.onboardingStatus(),
    queryFn: () => getOnboardingStatus(),
    staleTime: 30 * 1000, // 30 seconds - onboarding status doesn't change often
  });
}
