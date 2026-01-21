import {
  IconCircle,
  IconLoader2,
  IconCircleCheck,
  IconCircleX,
} from "@tabler/icons-react";

export type StatusType = "pending" | "in_progress" | "completed" | "failed";

interface StatusConfigItem {
  label: string;
  icon: typeof IconCircle;
  color: string;
  bgColor: string;
}

export const STATUS_CONFIG: Record<StatusType, StatusConfigItem> = {
  pending: {
    label: "Pending",
    icon: IconCircle,
    color: "text-muted-foreground",
    bgColor: "bg-muted-foreground/20",
  },
  in_progress: {
    label: "In Progress",
    icon: IconLoader2,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/20",
  },
  completed: {
    label: "Completed",
    icon: IconCircleCheck,
    color: "text-green-500",
    bgColor: "bg-green-500/20",
  },
  failed: {
    label: "Failed",
    icon: IconCircleX,
    color: "text-red-500",
    bgColor: "bg-red-500/20",
  },
};

export const STATUS_ORDER: StatusType[] = ["completed", "in_progress", "pending", "failed"];

export function getStatusConfig(status: string | null): StatusConfigItem {
  const normalizedStatus = (status || "pending") as StatusType;
  return STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.pending;
}
