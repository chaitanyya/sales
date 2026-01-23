import type { ParsedLeadScore, ScoringTier } from "@/lib/types/scoring";
import { tierConfigs } from "@/lib/types/scoring";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: ParsedLeadScore | null;
  size?: "sm" | "default";
}

const tierBgColors: Record<ScoringTier, string> = {
  hot: "bg-green-500",
  warm: "bg-orange-500",
  nurture: "bg-orange-400",
  disqualified: "bg-red-500",
};

export function ScoreBadge({ score, size = "default" }: ScoreBadgeProps) {
  const bgColor = score ? tierBgColors[score.tier] : "bg-neutral-600";
  const displayScore = score ? score.totalScore : 0;

  const sizeClasses = size === "sm" ? "text-[10px] w-5 h-5 min-w-5" : "text-xs w-6 h-6 min-w-6";

  return (
    <span
      className={cn(
        "flex items-center justify-center font-medium text-white",
        bgColor,
        sizeClasses
      )}
    >
      {displayScore}
    </span>
  );
}

interface ScoreBadgeLargeProps {
  score: ParsedLeadScore;
}

export function ScoreBadgeLarge({ score }: ScoreBadgeLargeProps) {
  const tierConfig = tierConfigs[score.tier];

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 border",
        tierConfig.bgColor,
        tierConfig.borderColor
      )}
    >
      <div className={cn("text-2xl font-bold", tierConfig.color)}>{score.totalScore}</div>
      <div>
        <div className={cn("text-sm font-medium", tierConfig.color)}>{tierConfig.label}</div>
        <div className="text-xs text-muted-foreground">
          {score.passesRequirements ? "Qualified" : "Disqualified"}
        </div>
      </div>
    </div>
  );
}

interface TierFilterTabsProps {
  activeTier: ScoringTier | "all" | "unscored";
  onTierChange: (tier: ScoringTier | "all" | "unscored") => void;
  counts: {
    all: number;
    hot: number;
    warm: number;
    nurture: number;
    disqualified: number;
    unscored: number;
  };
}

export function TierFilterTabs({ activeTier, onTierChange, counts }: TierFilterTabsProps) {
  const tabs: Array<{
    id: ScoringTier | "all" | "unscored";
    label: string;
    color?: string;
    count: number;
  }> = [
    { id: "all", label: "All", count: counts.all },
    { id: "hot", label: "Hot", color: "text-green-500", count: counts.hot },
    { id: "warm", label: "Warm", color: "text-orange-500", count: counts.warm },
    { id: "nurture", label: "Nurture", color: "text-orange-400", count: counts.nurture },
    {
      id: "disqualified",
      label: "Disqualified",
      color: "text-red-500",
      count: counts.disqualified,
    },
    { id: "unscored", label: "Unscored", color: "text-neutral-400", count: counts.unscored },
  ];

  return (
    <div className="flex items-center gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTierChange(tab.id)}
          className={cn(
            "px-2 py-1 text-xs font-medium transition-colors",
            activeTier === tab.id
              ? "bg-white/10 text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          <span className={tab.color}>{tab.label}</span>
          {tab.count > 0 && <span className="ml-1 opacity-60">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}
