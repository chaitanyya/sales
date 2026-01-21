import type { StatusType } from "@/lib/constants/status-config";

export function groupByStatus<T>(
  items: T[],
  getStatus: (item: T) => string | null
): Record<StatusType, T[]> {
  return items.reduce(
    (acc, item) => {
      const status = (getStatus(item) || "pending") as StatusType;
      if (!acc[status]) acc[status] = [];
      acc[status].push(item);
      return acc;
    },
    {} as Record<StatusType, T[]>
  );
}

export function getStatusCounts<T>(
  groupedItems: Record<StatusType, T[]>
): {
  all: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
} {
  const all =
    (groupedItems.pending?.length || 0) +
    (groupedItems.in_progress?.length || 0) +
    (groupedItems.completed?.length || 0) +
    (groupedItems.failed?.length || 0);

  return {
    all,
    pending: groupedItems.pending?.length || 0,
    inProgress: groupedItems.in_progress?.length || 0,
    completed: groupedItems.completed?.length || 0,
    failed: groupedItems.failed?.length || 0,
  };
}
