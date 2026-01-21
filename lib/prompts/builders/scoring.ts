import type {
  ParsedScoringConfig,
  RequiredCharacteristic,
  DemandSignifier,
} from "@/lib/types/scoring";
import { formatLeadContext, type LeadWithPeople } from "../formatters";

/**
 * Format required characteristics for the scoring prompt
 */
function formatRequiredCharacteristics(characteristics: RequiredCharacteristic[]): string {
  const enabled = characteristics.filter((c) => c.enabled);
  if (enabled.length === 0) return "No required characteristics defined.";

  return enabled.map((c, i) => `${i + 1}. ${c.name}\n   - ${c.description}`).join("\n");
}

/**
 * Format demand signifiers with weights for the scoring prompt
 */
function formatDemandSignifiers(signifiers: DemandSignifier[]): string {
  const enabled = signifiers.filter((s) => s.enabled);
  if (enabled.length === 0) return "No demand signifiers defined.";

  const totalWeight = enabled.reduce((sum, s) => sum + s.weight, 0);

  return enabled
    .map((s, i) => {
      const percentage = Math.round((s.weight / totalWeight) * 100);
      return `${i + 1}. ${s.name} (Weight: ${s.weight}/10, ${percentage}% of total score)\n   - ${s.description}`;
    })
    .join("\n");
}

/**
 * Build a scoring prompt for lead evaluation
 *
 * @param lead - The lead with associated people
 * @param config - The scoring configuration
 * @param outputPath - Path where Claude should write the JSON result
 * @returns Complete prompt string for scoring
 */
export function buildScoringPrompt(
  lead: LeadWithPeople,
  config: ParsedScoringConfig,
  outputPath: string
): string {
  const enabledRequirements = config.requiredCharacteristics.filter((c) => c.enabled);
  const enabledSignifiers = config.demandSignifiers.filter((s) => s.enabled);
  const totalWeight = enabledSignifiers.reduce((sum, s) => sum + s.weight, 0);

  const leadContext = formatLeadContext(lead, {
    includeProfile: true,
    includePeople: true,
  });

  return `You are a lead scoring analyst. Your task is to evaluate the following company as a sales lead and provide a detailed scoring assessment.

COMPANY INFORMATION:
${leadContext}

SCORING CRITERIA:

## Required Characteristics (Pass/Fail)
These are gates that must be passed for a lead to be considered qualified. If ANY required characteristic fails, the lead will be classified as "disqualified" regardless of the demand signifier scores.

${formatRequiredCharacteristics(config.requiredCharacteristics)}

## Demand Signifiers (Weighted Scoring)
Evaluate each of the following factors on a scale of 0-100. The final score is calculated as a weighted average.

${formatDemandSignifiers(config.demandSignifiers)}

## Tier Thresholds
- Hot: ${config.tierHotMin}+ (highest priority leads)
- Warm: ${config.tierWarmMin}-${config.tierHotMin - 1} (good potential)
- Nurture: ${config.tierNurtureMin}-${config.tierWarmMin - 1} (needs development)
- Disqualified: Below ${config.tierNurtureMin} OR fails any required characteristic

INSTRUCTIONS:

1. First, evaluate each Required Characteristic:
   - Research the company if needed using web search
   - Determine if each requirement is PASSED or FAILED
   - Provide a brief reason for each decision

2. If all requirements pass, score each Demand Signifier:
   - Research thoroughly to find evidence for each factor
   - Assign a score from 0-100 based on the evidence
   - Provide reasoning for each score

3. Calculate the total weighted score using this formula:
   Total Score = Sum of (signifier_score * weight) / total_weight

4. Determine the tier based on:
   - If any requirement fails: tier = "disqualified"
   - Otherwise: based on total score and tier thresholds

5. Write your complete assessment to the output file.

OUTPUT FORMAT:
Write a JSON file to: ${outputPath}

The JSON must have this exact structure:
{
  "passesRequirements": true/false,
  "requirementResults": [
    {
      "id": "${enabledRequirements[0]?.id || "req-id"}",
      "name": "${enabledRequirements[0]?.name || "Requirement Name"}",
      "passed": true/false,
      "reason": "Explanation of why this passed or failed"
    }
  ],
  "totalScore": 75,
  "scoreBreakdown": [
    {
      "id": "${enabledSignifiers[0]?.id || "sig-id"}",
      "name": "${enabledSignifiers[0]?.name || "Signifier Name"}",
      "weight": ${enabledSignifiers[0]?.weight || 5},
      "score": 80,
      "weightedScore": ${totalWeight > 0 ? Math.round((80 * (enabledSignifiers[0]?.weight || 5)) / totalWeight) : 0},
      "reason": "Explanation of the score"
    }
  ],
  "tier": "hot" | "warm" | "nurture" | "disqualified",
  "scoringNotes": "Overall summary and key observations about this lead"
}

IMPORTANT NOTES:
- Be thorough in your research - use web search if company profile doesn't have enough information
- Be objective and evidence-based in your scoring
- The requirementResults array must include an entry for each enabled requirement: ${enabledRequirements.map((r) => r.id).join(", ")}
- The scoreBreakdown array must include an entry for each enabled signifier: ${enabledSignifiers.map((s) => s.id).join(", ")}
- Calculate weightedScore as: (score * weight) / ${totalWeight}
- If requirements fail, still include scoreBreakdown but totalScore should reflect the disqualified status
- Write ONLY valid JSON to the output file, no additional text

Begin your analysis now.`;
}
