"use client";

import * as React from "react";
import { SelectionProvider } from "./selection-provider";
import { FloatingActionBar } from "./floating-action-bar";
import { CollapsibleStatusGroup } from "@/components/ui/collapsible-status-group";
import type { ActionConfig } from "./action-command-menu";
import type { SelectionEntityType } from "@/lib/store/selection-store";

type StatusConfigType = "lead_user" | "person_user";

interface SelectableEntityListProps<T, S extends string> {
  /** Type of entity for selection tracking */
  entityType: SelectionEntityType;
  /** Grouped items by status */
  groupedItems: Record<S, T[]>;
  /** Ordered list of status values to display */
  statusOrder: readonly S[];
  /** Config type for status badge styling */
  configType: StatusConfigType;
  /** Get the unique ID for an item */
  getItemId: (item: T) => number;
  /** Render function for each row */
  renderRow: (item: T) => React.ReactNode;
  /** Actions available for selected items */
  actions: ActionConfig[];
}

export function SelectableEntityList<T, S extends string>({
  entityType,
  groupedItems,
  statusOrder,
  configType,
  getItemId,
  renderRow,
  actions,
}: SelectableEntityListProps<T, S>) {
  // Collect all item IDs in display order
  const allIds = React.useMemo(() => {
    const ids: number[] = [];
    statusOrder.forEach((status) => {
      const items = groupedItems[status];
      if (items) {
        items.forEach((item) => ids.push(getItemId(item)));
      }
    });
    return ids;
  }, [groupedItems, statusOrder, getItemId]);

  return (
    <SelectionProvider entityType={entityType} allIds={allIds}>
      <div className="flex-1 overflow-auto">
        {statusOrder.map((status) => {
          const items = groupedItems[status];
          if (!items || items.length === 0) return null;

          return (
            <CollapsibleStatusGroup
              key={status}
              status={status}
              count={items.length}
              configType={configType}
            >
              {items.map((item) => (
                <React.Fragment key={getItemId(item)}>{renderRow(item)}</React.Fragment>
              ))}
            </CollapsibleStatusGroup>
          );
        })}
      </div>
      <FloatingActionBar actions={actions} />
    </SelectionProvider>
  );
}
