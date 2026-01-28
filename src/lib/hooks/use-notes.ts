import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addNote, getNotes, updateNote, deleteNote } from "@/lib/tauri/commands";
import type { Note } from "@/lib/tauri/types";

export function useNotes(entityType: "lead" | "person", entityId: number) {
    const queryClient = useQueryClient();
    const queryKey = ["notes", entityType, entityId];

    const query = useQuery({
        queryKey,
        queryFn: () => getNotes(entityType, entityId),
    });

    const addNoteMutation = useMutation({
        mutationFn: (content: string) => addNote(entityType, entityId, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    const updateNoteMutation = useMutation({
        mutationFn: ({ id, content }: { id: number; content: string }) =>
            updateNote(id, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    const deleteNoteMutation = useMutation({
        mutationFn: (id: number) => deleteNote(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
    });

    return {
        notes: query.data ?? [],
        isLoading: query.isLoading,
        addNote: addNoteMutation.mutateAsync,
        isAdding: addNoteMutation.isPending,
        updateNote: updateNoteMutation.mutateAsync,
        deleteNote: deleteNoteMutation.mutateAsync,
    };
}
