import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrgBinding, isOrgBound } from "@/lib/tauri/commands";
import type { OrgBinding } from "@/lib/tauri/types";

export function useOrgBinding() {
  const queryClient = useQueryClient();

  const query = useQuery<OrgBinding | null>({
    queryKey: ["org-binding"],
    queryFn: () => getOrgBinding(),
    staleTime: Infinity, // Org binding doesn't change often
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["org-binding"] });
  };

  return {
    orgBinding: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch,
  };
}

export function useIsOrgBound() {
  return useQuery<boolean>({
    queryKey: ["is-org-bound"],
    queryFn: () => isOrgBound(),
    staleTime: Infinity,
  });
}
