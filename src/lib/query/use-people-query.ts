import { useQuery } from "@tanstack/react-query";
import {
  getAllPeople,
  getPerson,
  getAdjacentPeople,
} from "@/lib/tauri/commands";
import { queryKeys } from "./keys";

/**
 * List view - fetches all people with company data
 */
export function usePeopleList() {
  return useQuery({
    queryKey: queryKeys.peopleList(),
    queryFn: () => getAllPeople(),
  });
}

/**
 * Detail view - fetches a single person by ID
 */
export function usePerson(id: number) {
  return useQuery({
    queryKey: queryKeys.person(id),
    queryFn: () => getPerson(id),
    enabled: id > 0,
  });
}

/**
 * Fetches adjacent people for navigation
 */
export function useAdjacentPeople(id: number) {
  return useQuery({
    queryKey: queryKeys.personAdjacent(id),
    queryFn: () => getAdjacentPeople(id),
    enabled: id > 0,
  });
}
