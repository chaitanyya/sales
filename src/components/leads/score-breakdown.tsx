"use client";

import type { ParsedLeadScore } from "@/lib/types/scoring";
import { tierConfigs } from "@/lib/types/scoring";
import { cn } from "@/lib/utils";
import { IconCheck, IconX } from "@tabler/icons-react";
import { Bars } from "./score-bars";

interface ScoreBreakdownProps {
  score: ParsedLeadScore;
}

export function ScoreBreakdown({ score }: ScoreBreakdownProps) {
  const tierConfig = tierConfigs[score.tier];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold tabular-nums", tierConfig.color)}>
            {score.totalScore}
          </span>
          <span className={cn("text-sm font-medium", tierConfig.color)}>{tierConfig.label}</span>
        </div>
        <Bars value={score.totalScore} tier={score.tier} size="lg" />
        <div className="text-xs text-muted-foreground">
          {score.passesRequirements ? "All requirements passed" : "Failed requirements"}
          {score.scoredAt && (
            <span className="ml-2">
              · Scored{" "}
              {new Date(score.scoredAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>

      {score.requirementResults.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Required Characteristics</h3>
          <div className="space-y-2">
            {score.requirementResults.map((req) => (
              <div key={req.id} className="py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  {req.passed ? (
                    <IconCheck className="w-4 h-4 text-green-500" />
                  ) : (
                    <IconX className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm">{req.name}</span>
                </div>
                <div className="text-xs text-muted-foreground pl-6">{req.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {score.scoreBreakdown.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Demand Signifiers</h3>
          <div className="space-y-2">
            {score.scoreBreakdown.map((sig) => (
              <div key={sig.id} className="py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm">{sig.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      ×{sig.weight}
                    </span>
                    <Bars value={sig.score} tier={score.tier} size="sm" />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{sig.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {score.scoringNotes && (
        <div>
          <h3 className="text-sm font-medium mb-3">AI Assessment</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{score.scoringNotes}</p>
        </div>
      )}
    </div>
  );
}

export function ScoreBreakdownCompact({ score }: ScoreBreakdownProps) {
  const tierConfig = tierConfigs[score.tier];
  const passedCount = score.requirementResults.filter((r) => r.passed).length;
  const totalReqs = score.requirementResults.length;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-lg font-bold tabular-nums", tierConfig.color)}>
            {score.totalScore}
          </span>
          <span className={cn("text-xs font-medium", tierConfig.color)}>{tierConfig.label}</span>
        </div>
        <Bars value={score.totalScore} tier={score.tier} size="default" />
        <div className="text-xs text-muted-foreground">
          {passedCount}/{totalReqs} requirements
        </div>
      </div>

      <div className="space-y-1.5">
        {score.scoreBreakdown.slice(0, 3).map((sig) => (
          <div key={sig.id} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground truncate">{sig.name}</span>
            <Bars value={sig.score} tier={score.tier} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
