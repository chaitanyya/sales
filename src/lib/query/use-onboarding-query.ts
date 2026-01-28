import { useQuery } from "@tanstack/react-query";
import { getOnboardingStatus } from "@/lib/tauri/commands";
import { queryKeys } from "./keys";
import { useAuthStore } from "@/lib/store/auth-store";

/**
 * Fetches onboarding status
 * Used to check which onboarding steps have been completed
 */
export function useOnboardingStatus() {
  const clerkOrgId = useAuthStore((state) => state.getCurrentOrgId());
  return useQuery({
    queryKey: queryKeys.onboardingStatus(clerkOrgId),
    queryFn: () => getOnboardingStatus(clerkOrgId),
    enabled: !!clerkOrgId,
    staleTime: 30 * 1000, // 30 seconds - onboarding status doesn't change often
  });
}
