"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useSelectionStore } from "@/lib/store/selection-store";
import { useSelectionContext } from "./selection-provider";
import { cn } from "@/lib/utils";

interface SelectableRowProps {
  /** Unique ID of the item */
  id: number;
  /** Content to render inside the row */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

export function SelectableRow({ id, children, className }: SelectableRowProps) {
  const { allIds } = useSelectionContext();
  // Use selectors to prevent full list re-renders on selection change
  const checked = useSelectionStore((state) => state.selectedIds.has(id));
  const toggle = useSelectionStore((state) => state.toggle);
  const selectRange = useSelectionStore((state) => state.selectRange);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (e.shiftKey) {
      // Get anchorId at click time, not via subscription (avoids re-renders)
      const anchorId = useSelectionStore.getState().anchorId;
      if (anchorId !== null) {
        selectRange(anchorId, id, allIds);
        return;
      }
    }
    toggle(id);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-accent/30 transition-colors text-sm",
        checked && "bg-primary/5",
        className
      )}
    >
      <div className="w-4 shrink-0 flex items-center justify-center">
        <Checkbox
          checked={checked}
          onClick={handleCheckboxClick}
          className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity",
            checked && "opacity-100"
          )}
        />
      </div>
      {children}
    </div>
  );
}
