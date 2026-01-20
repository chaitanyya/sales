import type {
  ScoringResult,
  ScoringTier,
  RequirementResult,
  SignifierScore,
  ParsedScoringConfig,
} from "@/lib/types/scoring";

interface RawScoringResult {
  passesRequirements?: boolean;
  requirementResults?: RawRequirementResult[];
  totalScore?: number;
  scoreBreakdown?: RawSignifierScore[];
  tier?: string;
  scoringNotes?: string;
}

interface RawRequirementResult {
  id?: string;
  name?: string;
  passed?: boolean;
  reason?: string;
}

interface RawSignifierScore {
  id?: string;
  name?: string;
  weight?: number;
  score?: number;
  weightedScore?: number;
  reason?: string;
}

function calculateTier(
  passesRequirements: boolean,
  totalScore: number,
  config: ParsedScoringConfig
): ScoringTier {
  if (!passesRequirements) {
    return "disqualified";
  }

  if (totalScore >= config.tierHotMin) {
    return "hot";
  } else if (totalScore >= config.tierWarmMin) {
    return "warm";
  } else if (totalScore >= config.tierNurtureMin) {
    return "nurture";
  } else {
    return "disqualified";
  }
}

function calculateTotalScore(
  scoreBreakdown: SignifierScore[],
  config: ParsedScoringConfig
): number {
  const enabledSignifiers = config.demandSignifiers.filter((s) => s.enabled);
  const totalWeight = enabledSignifiers.reduce((sum, s) => sum + s.weight, 0);

  if (totalWeight === 0) return 0;

  let weightedSum = 0;
  for (const entry of scoreBreakdown) {
    weightedSum += entry.score * entry.weight;
  }

  return Math.round(weightedSum / totalWeight);
}

export function parseScoringResult(rawJson: string, config: ParsedScoringConfig): ScoringResult {
  let raw: RawScoringResult;

  try {
    raw = JSON.parse(rawJson);
  } catch (e) {
    throw new Error(`Failed to parse scoring result JSON: ${e}`);
  }

  // Parse requirement results
  const requirementResults: RequirementResult[] = (raw.requirementResults || []).map((r) => ({
    id: r.id || "unknown",
    name: r.name || "Unknown Requirement",
    passed: r.passed ?? false,
    reason: r.reason || "No reason provided",
  }));

  // Calculate passesRequirements
  const passesRequirements =
    requirementResults.length === 0 || requirementResults.every((r) => r.passed);

  // Parse score breakdown
  const enabledSignifiers = config.demandSignifiers.filter((s) => s.enabled);
  const totalWeight = enabledSignifiers.reduce((sum, s) => sum + s.weight, 0);

  const scoreBreakdown: SignifierScore[] = (raw.scoreBreakdown || []).map((s) => {
    const weight = s.weight || 1;
    const score = Math.max(0, Math.min(100, s.score || 0));
    const weightedScore = totalWeight > 0 ? Math.round((score * weight) / totalWeight) : 0;

    return {
      id: s.id || "unknown",
      name: s.name || "Unknown Signifier",
      weight,
      score,
      weightedScore,
      reason: s.reason || "No reason provided",
    };
  });

  // Calculate or use provided total score
  const totalScore =
    raw.totalScore !== undefined
      ? Math.max(0, Math.min(100, raw.totalScore))
      : calculateTotalScore(scoreBreakdown, config);

  // Determine tier
  const tier = calculateTier(passesRequirements, totalScore, config);

  return {
    passesRequirements,
    requirementResults,
    totalScore,
    scoreBreakdown,
    tier,
    scoringNotes: raw.scoringNotes || "",
  };
}

export function validateScoringResult(
  result: ScoringResult,
  config: ParsedScoringConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check requirement results match config
  const enabledReqIds = new Set(
    config.requiredCharacteristics.filter((c) => c.enabled).map((c) => c.id)
  );
  const resultReqIds = new Set(result.requirementResults.map((r) => r.id));

  for (const id of enabledReqIds) {
    if (!resultReqIds.has(id)) {
      errors.push(`Missing requirement result for: ${id}`);
    }
  }

  // Check signifier scores match config
  const enabledSigIds = new Set(config.demandSignifiers.filter((s) => s.enabled).map((s) => s.id));
  const resultSigIds = new Set(result.scoreBreakdown.map((s) => s.id));

  for (const id of enabledSigIds) {
    if (!resultSigIds.has(id)) {
      errors.push(`Missing signifier score for: ${id}`);
    }
  }

  // Validate score ranges
  if (result.totalScore < 0 || result.totalScore > 100) {
    errors.push(`Total score out of range: ${result.totalScore}`);
  }

  for (const s of result.scoreBreakdown) {
    if (s.score < 0 || s.score > 100) {
      errors.push(`Signifier score out of range for ${s.name}: ${s.score}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
