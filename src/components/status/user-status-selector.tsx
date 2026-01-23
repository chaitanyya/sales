"use client";

import { useTransition, useOptimistic } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  LEAD_USER_STATUS_CONFIG,
  LEAD_USER_STATUS_ORDER,
  PERSON_USER_STATUS_CONFIG,
  PERSON_USER_STATUS_ORDER,
  type LeadUserStatusType,
  type PersonUserStatusType,
} from "@/lib/constants/status-config";
import { updateLeadUserStatus, updatePersonUserStatus } from "@/lib/tauri/commands";

interface LeadStatusSelectorProps {
  type: "lead";
  entityId: number;
  currentStatus: LeadUserStatusType;
}

interface PersonStatusSelectorProps {
  type: "person";
  entityId: number;
  currentStatus: PersonUserStatusType;
}

type UserStatusSelectorProps = LeadStatusSelectorProps | PersonStatusSelectorProps;

export function UserStatusSelector(props: UserStatusSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(props.currentStatus);

  const config =
    props.type === "lead"
      ? LEAD_USER_STATUS_CONFIG[optimisticStatus as LeadUserStatusType]
      : PERSON_USER_STATUS_CONFIG[optimisticStatus as PersonUserStatusType];
  const StatusIcon = config.icon;

  const statusOrder = props.type === "lead" ? LEAD_USER_STATUS_ORDER : PERSON_USER_STATUS_ORDER;
  const statusConfig = props.type === "lead" ? LEAD_USER_STATUS_CONFIG : PERSON_USER_STATUS_CONFIG;

  const handleStatusChange = (newStatus: string) => {
    startTransition(async () => {
      setOptimisticStatus(newStatus as LeadUserStatusType | PersonUserStatusType);
      try {
        if (props.type === "lead") {
          await updateLeadUserStatus(props.entityId, newStatus as LeadUserStatusType);
        } else {
          await updatePersonUserStatus(props.entityId, newStatus as PersonUserStatusType);
        }
      } catch (error) {
        console.error("Failed to update status:", error);
        toast.error("Failed to update status", {
          description: error instanceof Error ? error.message : "Please try again",
        });
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isPending}>
        <button
          className={cn(
            "flex items-center gap-2 px-2 py-1 border border-white/10 bg-white/2 rounded hover:bg-white/4 transition-colors text-sm ring-none focus:ring-0 outline-none",
            isPending && "opacity-50 pointer-events-none"
          )}
        >
          <StatusIcon className={cn("w-4 h-4", config.color)} />
          <span className="flex-1 text-left">{config.label}</span>
          <IconChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuRadioGroup value={optimisticStatus} onValueChange={handleStatusChange}>
          {statusOrder.map((status) => {
            const itemConfig = statusConfig[status as keyof typeof statusConfig];
            const ItemIcon = itemConfig.icon;
            return (
              <DropdownMenuRadioItem key={status} value={status}>
                <ItemIcon className={cn("w-4 h-4", itemConfig.color)} />
                <span>{itemConfig.label}</span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
