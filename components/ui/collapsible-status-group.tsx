"use client";

import { useState, ReactNode } from "react";
import { IconChevronDown, IconChevronRight, IconPlus } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG, StatusType } from "@/lib/constants/status-config";

interface CollapsibleStatusGroupProps {
  status: StatusType;
  count: number;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleStatusGroup({
  status,
  count,
  children,
  defaultOpen = true,
}: CollapsibleStatusGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <div>
      {/* Status group header */}
      <div className="sticky top-0 bg-black/95 backdrop-blur-sm z-10 flex items-center gap-2 px-3 py-2 text-sm border-b border-white/5">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-4 shrink-0 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
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
        <button className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100">
          <IconPlus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Collapsible content */}
      {isOpen && children}
    </div>
  );
}
