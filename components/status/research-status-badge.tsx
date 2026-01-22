import { cn } from "@/lib/utils";
import { RESEARCH_STATUS_CONFIG, type ResearchStatusType } from "@/lib/constants/status-config";

interface ResearchStatusBadgeProps {
  status: string | null;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function ResearchStatusBadge({
  status,
  showLabel = false,
  size = "sm",
}: ResearchStatusBadgeProps) {
  const normalizedStatus = (status || "pending") as ResearchStatusType;
  const config = RESEARCH_STATUS_CONFIG[normalizedStatus];
  const StatusIcon = config.icon;

  const isSpinning = normalizedStatus === "in_progress";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5",
        size === "sm" && "text-xs",
        size === "md" && "text-sm"
      )}
      title={config.label}
    >
      <StatusIcon
        className={cn(
          config.color,
          size === "sm" && "w-3.5 h-3.5",
          size === "md" && "w-4 h-4",
          isSpinning && "animate-spin"
        )}
      />
      {showLabel && <span className="text-muted-foreground">{config.label}</span>}
    </div>
  );
}
