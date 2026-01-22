import {
  type StatusType,
  type LeadUserStatusType,
  type PersonUserStatusType,
  RESEARCH_STATUS_ORDER,
  LEAD_USER_STATUS_ORDER,
  PERSON_USER_STATUS_ORDER,
} from "@/lib/constants/status-config";

/**
 * Generic function to group items by a status field.
 * Validates status against allowed values and uses default if invalid.
 */
function groupItemsByStatus<T, S extends string>(
  items: T[],
  getStatus: (item: T) => string | null,
  validStatuses: readonly S[],
  defaultStatus: S
): Record<S, T[]> {
  return items.reduce(
    (acc, item) => {
      const rawStatus = getStatus(item);
      const status =
        rawStatus && validStatuses.includes(rawStatus as S) ? (rawStatus as S) : defaultStatus;
      if (!acc[status]) acc[status] = [];
      acc[status].push(item);
      return acc;
    },
    {} as Record<S, T[]>
  );
}

/**
 * Group items by research status (pending, in_progress, completed, failed)
 */
export function groupByStatus<T>(
  items: T[],
  getStatus: (item: T) => string | null
): Record<StatusType, T[]> {
  return groupItemsByStatus(items, getStatus, RESEARCH_STATUS_ORDER, "pending");
}

/**
 * Group items by lead user status (sales pipeline stage)
 */
export function groupByLeadUserStatus<T>(
  items: T[],
  getStatus: (item: T) => string | null
): Record<LeadUserStatusType, T[]> {
  return groupItemsByStatus(items, getStatus, LEAD_USER_STATUS_ORDER, "new");
}

/**
 * Group items by person user status (contact engagement stage)
 */
export function groupByPersonUserStatus<T>(
  items: T[],
  getStatus: (item: T) => string | null
): Record<PersonUserStatusType, T[]> {
  return groupItemsByStatus(items, getStatus, PERSON_USER_STATUS_ORDER, "new");
}

/**
 * Get counts for research status groups
 */
export function getStatusCounts<T>(groupedItems: Record<StatusType, T[]>): {
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
