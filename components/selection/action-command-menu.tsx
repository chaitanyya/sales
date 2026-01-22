"use client";

import * as React from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useSelectionStore } from "@/lib/store/selection-store";
import { cn } from "@/lib/utils";

export interface ActionConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  shortcut?: string;
  destructive?: boolean;
  onExecute: (selectedIds: number[]) => void | Promise<void>;
}

interface ActionCommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: ActionConfig[];
}

export function ActionCommandMenu({
  open,
  onOpenChange,
  actions,
}: ActionCommandMenuProps) {
  const getSelectedIds = useSelectionStore((state) => state.getSelectedIds);
  const clearAll = useSelectionStore((state) => state.clearAll);

  // Group actions by category
  const groupedActions = React.useMemo(() => {
    const groups: Record<string, ActionConfig[]> = {};
    actions.forEach((action) => {
      if (!groups[action.group]) {
        groups[action.group] = [];
      }
      groups[action.group].push(action);
    });
    return groups;
  }, [actions]);

  const handleSelect = React.useCallback(
    async (action: ActionConfig) => {
      const selectedIds = getSelectedIds();
      onOpenChange(false);

      try {
        await action.onExecute(selectedIds);
        // Clear selection after successful action (optional, depends on UX preference)
        if (!action.destructive) {
          // Keep selection for non-destructive actions so user can run multiple actions
        } else {
          clearAll();
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.id}:`, error);
      }
    },
    [getSelectedIds, onOpenChange, clearAll]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search actions..." />
      <CommandList>
        <CommandEmpty>No actions found.</CommandEmpty>
        {Object.entries(groupedActions).map(([group, groupActions]) => (
          <CommandGroup key={group} heading={group}>
            {groupActions.map((action) => {
              const Icon = action.icon;
              return (
                <CommandItem
                  key={action.id}
                  onSelect={() => handleSelect(action)}
                  className={cn(
                    action.destructive &&
                      "text-destructive data-[selected=true]:text-destructive"
                  )}
                >
                  <Icon className="mr-2 size-4" />
                  <span>{action.label}</span>
                  {action.shortcut && (
                    <CommandShortcut>{action.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
