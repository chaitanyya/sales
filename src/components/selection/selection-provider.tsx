"use client";

import * as React from "react";
import { useSelectionStore, type SelectionEntityType } from "@/lib/store/selection-store";
import { useEffect } from "react";

interface SelectionContextValue {
  entityType: SelectionEntityType;
  allIds: number[];
}

const SelectionContext = React.createContext<SelectionContextValue | null>(null);

export function useSelectionContext() {
  const context = React.useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelectionContext must be used within SelectionProvider");
  }
  return context;
}

interface SelectionProviderProps {
  children: React.ReactNode;
  entityType: SelectionEntityType;
  allIds: number[];
}

export function SelectionProvider({ children, entityType, allIds }: SelectionProviderProps) {
  // Use individual selectors to avoid re-rendering children on selection change
  const setEntityType = useSelectionStore((state) => state.setEntityType);
  const clearAll = useSelectionStore((state) => state.clearAll);
  const selectAll = useSelectionStore((state) => state.selectAll);

  // Set entity type on mount, clear on unmount
  useEffect(() => {
    setEntityType(entityType);
    return () => {
      clearAll();
      setEntityType(null);
    };
  }, [entityType, setEntityType, clearAll]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+A or Ctrl+A to select all
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        // Don't interfere with input elements
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        selectAll(allIds);
      }

      // Escape to clear selection
      if (e.key === "Escape") {
        clearAll();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [allIds, selectAll, clearAll]);

  return (
    <SelectionContext.Provider value={{ entityType, allIds }}>{children}</SelectionContext.Provider>
  );
}
