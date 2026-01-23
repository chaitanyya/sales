import { useCallback } from "react";
import {
  usePeopleList,
  usePerson,
  useAdjacentPeople,
  useLeadsForSelect as useLeadsForSelectQuery,
  useInsertPerson,
  useUpdatePersonStatus,
  useDeletePeople as useDeletePeopleMutation,
} from "@/lib/query";
import type { PersonWithCompany, AdjacentResult, NewPerson } from "@/lib/tauri/types";

/**
 * Hook for the people list page.
 * Returns all people with company info and loading state.
 * Now powered by TanStack Query.
 */
export function useAllPeople() {
  const { data, isLoading, refetch } = usePeopleList();

  return {
    people: data ?? [],
    isLoading,
    refresh: refetch,
  };
}

/**
 * Hook for getting leads list for the AddPersonModal select dropdown.
 * Now powered by TanStack Query.
 */
export function useLeadsForSelect() {
  const { data, refetch } = useLeadsForSelectQuery();

  return {
    leads: data ?? [],
    refresh: refetch,
  };
}

/**
 * Hook for a single person detail page.
 * Returns person and adjacent navigation.
 * Now powered by TanStack Query.
 */
export function usePersonDetail(personId: number): {
  person: PersonWithCompany | undefined;
  adjacentPeople: AdjacentResult | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
} {
  const personQuery = usePerson(personId);
  const adjacentQuery = useAdjacentPeople(personId);

  const isLoading = personQuery.isLoading || adjacentQuery.isLoading;
  const error = personQuery.error || adjacentQuery.error;

  const refresh = useCallback(async () => {
    await Promise.all([personQuery.refetch(), adjacentQuery.refetch()]);
  }, [personQuery, adjacentQuery]);

  return {
    person: personQuery.data ?? undefined,
    adjacentPeople: adjacentQuery.data ?? undefined,
    isLoading,
    error: error as Error | undefined,
    refresh,
  };
}

/**
 * Hook for people mutations.
 * Returns mutation functions for updating and deleting people.
 * Now powered by TanStack Query.
 */
export function usePeopleMutations() {
  const insertPersonMutation = useInsertPerson();
  const updatePersonStatusMutation = useUpdatePersonStatus();
  const deletePeopleMutation = useDeletePeopleMutation();

  const insertPerson = useCallback(
    async (data: NewPerson): Promise<number> => {
      return insertPersonMutation.mutateAsync(data);
    },
    [insertPersonMutation]
  );

  const updatePersonUserStatus = useCallback(
    async (personId: number, status: string): Promise<void> => {
      await updatePersonStatusMutation.mutateAsync({ personId, status });
    },
    [updatePersonStatusMutation]
  );

  const deletePeople = useCallback(
    async (personIds: number[]): Promise<void> => {
      await deletePeopleMutation.mutateAsync(personIds);
    },
    [deletePeopleMutation]
  );

  return {
    insertPerson,
    updatePersonUserStatus,
    deletePeople,
  };
}
