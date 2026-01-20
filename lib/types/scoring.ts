import type { LeadScore, ScoringConfig } from "@/db/schema";

// Tier classification
export type ScoringTier = "hot" | "warm" | "nurture" | "disqualified";

// Required characteristic (pass/fail gate)
export interface RequiredCharacteristic {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

// Demand signifier (weighted scoring factor)
export interface DemandSignifier {
  id: string;
  name: string;
  description: string;
  weight: number; // 1-10
  enabled: boolean;
}

// Requirement result from scoring
export interface RequirementResult {
  id: string;
  name: string;
  passed: boolean;
  reason: string;
}

// Score breakdown for a single signifier
export interface SignifierScore {
  id: string;
  name: string;
  weight: number;
  score: number; // 0-100
  weightedScore: number; // (score * weight) / totalWeight
  reason: string;
}

// Full scoring result from the AI
export interface ScoringResult {
  passesRequirements: boolean;
  requirementResults: RequirementResult[];
  totalScore: number;
  scoreBreakdown: SignifierScore[];
  tier: ScoringTier;
  scoringNotes: string;
}

// Parsed scoring config with typed JSON fields
export interface ParsedScoringConfig extends Omit<
  ScoringConfig,
  "requiredCharacteristics" | "demandSignifiers"
> {
  requiredCharacteristics: RequiredCharacteristic[];
  demandSignifiers: DemandSignifier[];
}

// Parsed lead score with typed JSON fields
export interface ParsedLeadScore extends Omit<LeadScore, "requirementResults" | "scoreBreakdown"> {
  requirementResults: RequirementResult[];
  scoreBreakdown: SignifierScore[];
}

// Lead with score for list display
export interface LeadWithScore {
  id: number;
  companyName: string;
  website: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  researchStatus: "pending" | "in_progress" | "completed" | "failed" | null;
  score: ParsedLeadScore | null;
}

// Tier configuration for UI display
export interface TierConfig {
  tier: ScoringTier;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  minScore: number;
}

export const tierConfigs: Record<ScoringTier, Omit<TierConfig, "minScore">> = {
  hot: {
    tier: "hot",
    label: "Hot",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  warm: {
    tier: "warm",
    label: "Warm",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
  nurture: {
    tier: "nurture",
    label: "Nurture",
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    borderColor: "border-orange-400/30",
  },
  disqualified: {
    tier: "disqualified",
    label: "Disqualified",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
};

// Default scoring configuration
export const defaultScoringConfig: Omit<ParsedScoringConfig, "id" | "createdAt" | "updatedAt"> = {
  name: "default",
  isActive: true,
  requiredCharacteristics: [
    {
      id: "min-company-size",
      name: "Minimum Company Size",
      description: "Company must have at least 50 employees",
      enabled: true,
    },
    {
      id: "target-industry",
      name: "Target Industry",
      description: "Company must be in technology, finance, or healthcare sectors",
      enabled: true,
    },
  ],
  demandSignifiers: [
    {
      id: "growth-signals",
      name: "Growth Signals",
      description: "Recent funding, hiring, or expansion announcements",
      weight: 8,
      enabled: true,
    },
    {
      id: "tech-adoption",
      name: "Technology Adoption",
      description: "Use of modern tech stack and willingness to adopt new solutions",
      weight: 7,
      enabled: true,
    },
    {
      id: "budget-authority",
      name: "Budget Authority",
      description: "Evidence of budget and decision-making authority for relevant purchases",
      weight: 9,
      enabled: true,
    },
    {
      id: "pain-points",
      name: "Pain Point Alignment",
      description: "Company has challenges that our solution addresses",
      weight: 10,
      enabled: true,
    },
    {
      id: "timeline-urgency",
      name: "Timeline Urgency",
      description: "Indicators of urgency or upcoming projects requiring our solution",
      weight: 6,
      enabled: true,
    },
  ],
  tierHotMin: 80,
  tierWarmMin: 50,
  tierNurtureMin: 30,
};
