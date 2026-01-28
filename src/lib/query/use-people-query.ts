import { useQuery } from "@tanstack/react-query";
import {
  getAllPeople,
  getPerson,
  getAdjacentPeople,
} from "@/lib/tauri/commands";
import { queryKeys } from "./keys";
import { useAuthStore } from "@/lib/store/auth-store";

/**
 * List view - fetches all people with company data
 */
export function usePeopleList() {
  const clerkOrgId = useAuthStore((state) => state.getCurrentOrgId());
  return useQuery({
    queryKey: queryKeys.peopleList(clerkOrgId),
    queryFn: () => getAllPeople(clerkOrgId),
    enabled: !!clerkOrgId,
  });
}

/**
 * Detail view - fetches a single person by ID
 */
export function usePerson(id: number) {
  const clerkOrgId = useAuthStore((state) => state.getCurrentOrgId());
  return useQuery({
    queryKey: queryKeys.person(id, clerkOrgId),
    queryFn: () => getPerson(id, clerkOrgId),
    enabled: id > 0 && !!clerkOrgId,
  });
}

/**
 * Fetches adjacent people for navigation
 */
export function useAdjacentPeople(id: number) {
  const clerkOrgId = useAuthStore((state) => state.getCurrentOrgId());
  return useQuery({
    queryKey: queryKeys.personAdjacent(id, clerkOrgId),
    queryFn: () => getAdjacentPeople(id, clerkOrgId),
    enabled: id > 0 && !!clerkOrgId,
  });
}
