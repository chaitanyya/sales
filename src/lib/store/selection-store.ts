import { create } from "zustand";

export type SelectionEntityType = "lead" | "person";

interface SelectionState {
  selectedIds: Set<number>;
  entityType: SelectionEntityType | null;
  anchorId: number | null;

  // Actions
  select: (id: number) => void;
  deselect: (id: number) => void;
  toggle: (id: number) => void;
  selectAll: (ids: number[]) => void;
  selectRange: (fromId: number, toId: number, allIds: number[]) => void;
  clearAll: () => void;
  setEntityType: (type: SelectionEntityType | null) => void;
  setAnchorId: (id: number | null) => void;

  // Getters
  isSelected: (id: number) => boolean;
  getSelectedIds: () => number[];
  getSelectedCount: () => number;
}

export const useSelectionStore = create<SelectionState>()((set, get) => ({
  selectedIds: new Set<number>(),
  entityType: null,
  anchorId: null,

  select: (id) =>
    set((state) => ({
      selectedIds: new Set(state.selectedIds).add(id),
      anchorId: id,
    })),

  deselect: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedIds);
      newSet.delete(id);
      return { selectedIds: newSet };
    }),

  toggle: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedIds);
      if (newSet.has(id)) {
        newSet.delete(id);
        return { selectedIds: newSet };
      } else {
        newSet.add(id);
        return { selectedIds: newSet, anchorId: id };
      }
    }),

  selectAll: (ids) =>
    set({
      selectedIds: new Set(ids),
      anchorId: ids.length > 0 ? ids[ids.length - 1] : null,
    }),

  selectRange: (fromId, toId, allIds) =>
    set((state) => {
      const fromIndex = allIds.indexOf(fromId);
      const toIndex = allIds.indexOf(toId);
      if (fromIndex === -1 || toIndex === -1) return state;

      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);
      const rangeIds = allIds.slice(start, end + 1);

      const newSet = new Set(state.selectedIds);
      rangeIds.forEach((id) => newSet.add(id));

      return { selectedIds: newSet };
    }),

  clearAll: () =>
    set({
      selectedIds: new Set<number>(),
      anchorId: null,
    }),

  setEntityType: (type) =>
    set({
      entityType: type,
      selectedIds: new Set<number>(),
      anchorId: null,
    }),

  setAnchorId: (id) => set({ anchorId: id }),

  isSelected: (id) => get().selectedIds.has(id),
  getSelectedIds: () => Array.from(get().selectedIds),
  getSelectedCount: () => get().selectedIds.size,
}));
