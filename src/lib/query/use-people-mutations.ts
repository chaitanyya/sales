import { useMutation } from "@tanstack/react-query";
import {
  insertPerson,
  updatePersonUserStatus,
  deletePeople,
} from "@/lib/tauri/commands";
import type { NewPerson, PersonWithCompany } from "@/lib/tauri/types";
import { queryClient } from "./query-client";
import { queryKeys } from "./keys";
import { useAuthStore } from "@/lib/store/auth-store";

/**
 * Insert a new person
 * Note: Event bridge handles cache invalidation via people-bulk-created event
 */
export function useInsertPerson() {
  return useMutation({
    mutationFn: (data: NewPerson) => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();
      if (!clerkOrgId) {
        throw new Error("Cannot create person: No organization selected");
      }
      return insertPerson(data, clerkOrgId);
    },
    // No onSuccess - event bridge handles invalidation
  });
}

/**
 * Update person user status with optimistic update
 */
export function useUpdatePersonStatus() {
  return useMutation({
    mutationFn: ({ personId, status }: { personId: number; status: string }) => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();
      if (!clerkOrgId) {
        throw new Error("Cannot update person: No organization selected");
      }
      return updatePersonUserStatus(personId, status, clerkOrgId);
    },
    onMutate: async ({ personId, status }) => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.person(personId, clerkOrgId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.peopleList(clerkOrgId) });

      // Snapshot previous values
      const previousPerson = queryClient.getQueryData<PersonWithCompany | null>(
        queryKeys.person(personId, clerkOrgId)
      );
      const previousPeople = queryClient.getQueryData<PersonWithCompany[]>(
        queryKeys.peopleList(clerkOrgId)
      );

      // Optimistically update individual person
      queryClient.setQueryData<PersonWithCompany | null>(
        queryKeys.person(personId, clerkOrgId),
        (old) => (old ? { ...old, userStatus: status } : old)
      );

      // Optimistically update people list
      queryClient.setQueryData<PersonWithCompany[]>(
        queryKeys.peopleList(clerkOrgId),
        (old) =>
          old?.map((person) =>
            person.id === personId ? { ...person, userStatus: status } : person
          )
      );

      return { previousPerson, previousPeople };
    },
    onError: (_err, { personId }, context) => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();
      // Rollback on error
      if (context?.previousPerson !== undefined) {
        queryClient.setQueryData(
          queryKeys.person(personId, clerkOrgId),
          context.previousPerson
        );
      }
      if (context?.previousPeople !== undefined) {
        queryClient.setQueryData(queryKeys.peopleList(clerkOrgId), context.previousPeople);
      }
    },
  });
}

/**
 * Delete people with optimistic update
 */
export function useDeletePeople() {
  return useMutation({
    mutationFn: (personIds: number[]) => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();
      if (!clerkOrgId) {
        throw new Error("Cannot delete people: No organization selected");
      }
      return deletePeople(personIds, clerkOrgId);
    },
    onMutate: async (personIds) => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.peopleList(clerkOrgId) });

      // Snapshot previous value
      const previousPeople = queryClient.getQueryData<PersonWithCompany[]>(
        queryKeys.peopleList(clerkOrgId)
      );

      // Optimistically remove from list
      queryClient.setQueryData<PersonWithCompany[]>(
        queryKeys.peopleList(clerkOrgId),
        (old) => old?.filter((person) => !personIds.includes(person.id))
      );

      return { previousPeople };
    },
    onError: (_err, _personIds, context) => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();
      // Rollback on error
      if (context?.previousPeople !== undefined) {
        queryClient.setQueryData(queryKeys.peopleList(clerkOrgId), context.previousPeople);
      }
    },
    onSettled: () => {
      const clerkOrgId = useAuthStore.getState().getCurrentOrgId();
      // Invalidate to ensure consistency
      // Note: Event bridge also handles this via person-deleted event
      queryClient.invalidateQueries({ queryKey: queryKeys.peopleList(clerkOrgId) });
    },
  });
}
