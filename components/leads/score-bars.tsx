import type { ParsedLeadScore, ScoringTier } from "@/lib/types/scoring";
import { cn } from "@/lib/utils";

const tierColors: Record<ScoringTier, string> = {
  hot: "bg-green-500",
  warm: "bg-orange-500",
  nurture: "bg-orange-400",
  disqualified: "bg-red-500",
};

const tierTextColors: Record<ScoringTier, string> = {
  hot: "text-green-500",
  warm: "text-orange-500",
  nurture: "text-orange-400",
  disqualified: "text-red-500",
};

const TOTAL_BARS = 10;

// Base component for rendering score bars
interface BarsProps {
  value: number;
  tier: ScoringTier | null;
  size?: "sm" | "default" | "lg";
}

export function Bars({ value, tier, size = "default" }: BarsProps) {
  const filledBars = Math.floor(value / 10);
  const partialFill = (value % 10) / 10;
  const tierColor = tier ? tierColors[tier] : "bg-neutral-500";

  const sizeConfig = {
    sm: { barWidth: "w-[2px]", barHeight: "h-3", gap: "gap-[2px]" },
    default: { barWidth: "w-1", barHeight: "h-4", gap: "gap-[2px]" },
    lg: { barWidth: "w-1.5", barHeight: "h-5", gap: "gap-[3px]" },
  };

  const { barWidth, barHeight, gap } = sizeConfig[size];

  return (
    <div className={cn("flex items-end", gap)}>
      {Array.from({ length: TOTAL_BARS }).map((_, index) => {
        const isFilled = index < filledBars;
        const isPartial = index === filledBars && partialFill > 0;

        return (
          <div key={index} className={cn("relative bg-white/10", barWidth, barHeight)}>
            {(isFilled || isPartial) && (
              <div
                className={cn("absolute bottom-0 left-0 right-0", tierColor)}
                style={{ height: isFilled ? "100%" : `${partialFill * 100}%` }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ScoreBars - for use in lead list rows
interface ScoreBarsProps {
  score: ParsedLeadScore | null;
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
}

export function ScoreBars({ score, size = "default", showLabel = false }: ScoreBarsProps) {
  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <span className="text-sm font-medium tabular-nums w-2">{score?.totalScore ?? 0}</span>
      )}
      <Bars value={score?.totalScore ?? 0} tier={score?.tier ?? null} size={size} />
    </div>
  );
}

// ScoreCard - for use in lead detail sidebar
interface ScoreCardProps {
  score: ParsedLeadScore | null;
  className?: string;
}

export function ScoreCard({ score, className }: ScoreCardProps) {
  const totalScore = score?.totalScore ?? 0;
  const tier = score?.tier;
  const tierTextColor = tier ? tierTextColors[tier] : "text-neutral-400";
  const tierLabel = tier
    ? { hot: "Hot", warm: "Warm", nurture: "Nurture", disqualified: "Disqualified" }[tier]
    : "Unscored";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-lg font-bold tabular-nums", tierTextColor)}>{totalScore}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{tierLabel}</span>
      </div>
      <Bars value={totalScore} tier={tier ?? null} size="default" />
      {score && (
        <div className="text-xs text-muted-foreground">
          {score.passesRequirements
            ? `${score.requirementResults.filter((r) => r.passed).length}/${score.requirementResults.length} requirements`
            : "Failed requirements"}
        </div>
      )}
    </div>
  );
}

export { tierColors, tierTextColors };
