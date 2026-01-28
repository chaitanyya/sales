"use client";

import { useState, ReactNode } from "react";
import { IconChevronDown, IconChevronRight, IconPlus } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  STATUS_CONFIG,
  LEAD_USER_STATUS_CONFIG,
  PERSON_USER_STATUS_CONFIG,
  type StatusType,
  type LeadUserStatusType,
  type PersonUserStatusType,
} from "@/lib/constants/status-config";

type StatusConfigType = "research" | "lead_user" | "person_user";

interface CollapsibleStatusGroupProps {
  status: string;
  count: number;
  children: ReactNode;
  defaultOpen?: boolean;
  configType?: StatusConfigType;
}

export function CollapsibleStatusGroup({
  status,
  count,
  children,
  defaultOpen = true,
  configType = "research",
}: CollapsibleStatusGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Get the appropriate config based on type
  const config =
    configType === "lead_user"
      ? LEAD_USER_STATUS_CONFIG[status as LeadUserStatusType]
      : configType === "person_user"
        ? PERSON_USER_STATUS_CONFIG[status as PersonUserStatusType]
        : STATUS_CONFIG[status as StatusType];

  const StatusIcon = config.icon;

  return (
    <div className="group/status">
      <div className="sticky top-0 bg-secondary/95 backdrop-blur-sm z-10 flex items-center gap-2 px-3 py-2 text-sm border-b border-border">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-4 shrink-0 flex items-center justify-center hover:bg-accent/50 rounded transition-colors"
        >
          {isOpen ? (
            <IconChevronDown className="w-3 h-3 text-muted-foreground" />
          ) : (
            <IconChevronRight className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
        <StatusIcon className={cn("w-4 h-4 shrink-0", config.color)} />
        <span className="font-medium">{config.label}</span>
        <span className="text-muted-foreground text-xs">{count}</span>
        <div className="flex-1" />
        <button className="p-1 hover:bg-accent/50 rounded opacity-0 group-hover/status:opacity-100 transition-opacity">
          <IconPlus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {isOpen && children}
    </div>
  );
}
