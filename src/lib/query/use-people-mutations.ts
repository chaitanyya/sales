import { useMutation } from "@tanstack/react-query";
import {
  insertPerson,
  updatePersonUserStatus,
  deletePeople,
} from "@/lib/tauri/commands";
import type { NewPerson, PersonWithCompany } from "@/lib/tauri/types";
import { queryClient } from "./query-client";
import { queryKeys } from "./keys";

/**
 * Insert a new person
 * Note: Event bridge handles cache invalidation via people-bulk-created event
 */
export function useInsertPerson() {
  return useMutation({
    mutationFn: (data: NewPerson) => insertPerson(data),
    // No onSuccess - event bridge handles invalidation
  });
}

/**
 * Update person user status with optimistic update
 */
export function useUpdatePersonStatus() {
  return useMutation({
    mutationFn: ({ personId, status }: { personId: number; status: string }) =>
      updatePersonUserStatus(personId, status),
    onMutate: async ({ personId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.person(personId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.peopleList() });

      // Snapshot previous values
      const previousPerson = queryClient.getQueryData<PersonWithCompany | null>(
        queryKeys.person(personId)
      );
      const previousPeople = queryClient.getQueryData<PersonWithCompany[]>(
        queryKeys.peopleList()
      );

      // Optimistically update individual person
      queryClient.setQueryData<PersonWithCompany | null>(
        queryKeys.person(personId),
        (old) => (old ? { ...old, userStatus: status } : old)
      );

      // Optimistically update people list
      queryClient.setQueryData<PersonWithCompany[]>(
        queryKeys.peopleList(),
        (old) =>
          old?.map((person) =>
            person.id === personId ? { ...person, userStatus: status } : person
          )
      );

      return { previousPerson, previousPeople };
    },
    onError: (_err, { personId }, context) => {
      // Rollback on error
      if (context?.previousPerson !== undefined) {
        queryClient.setQueryData(
          queryKeys.person(personId),
          context.previousPerson
        );
      }
      if (context?.previousPeople !== undefined) {
        queryClient.setQueryData(queryKeys.peopleList(), context.previousPeople);
      }
    },
  });
}

/**
 * Delete people with optimistic update
 */
export function useDeletePeople() {
  return useMutation({
    mutationFn: (personIds: number[]) => deletePeople(personIds),
    onMutate: async (personIds) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.peopleList() });

      // Snapshot previous value
      const previousPeople = queryClient.getQueryData<PersonWithCompany[]>(
        queryKeys.peopleList()
      );

      // Optimistically remove from list
      queryClient.setQueryData<PersonWithCompany[]>(
        queryKeys.peopleList(),
        (old) => old?.filter((person) => !personIds.includes(person.id))
      );

      return { previousPeople };
    },
    onError: (_err, _personIds, context) => {
      // Rollback on error
      if (context?.previousPeople !== undefined) {
        queryClient.setQueryData(queryKeys.peopleList(), context.previousPeople);
      }
    },
    onSettled: () => {
      // Invalidate to ensure consistency
      // Note: Event bridge also handles this via person-deleted event
      queryClient.invalidateQueries({ queryKey: queryKeys.peopleList() });
    },
  });
}
