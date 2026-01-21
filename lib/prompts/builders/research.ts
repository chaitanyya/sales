import type { Lead, Person } from "@/db/schema";
import { formatLeadContext, formatPersonContext, formatWhatWeDo } from "../formatters";

/**
 * Output paths for company research
 */
export interface CompanyResearchOutputPaths {
  companyProfile: string;
  people: string;
}

/**
 * Build a company research prompt
 *
 * @param basePrompt - The user-configured research prompt from database
 * @param lead - The lead/company to research
 * @param outputPaths - Paths where Claude should write outputs
 * @param companyContext - Optional "what we do" context for the user's company
 * @returns Complete prompt string for company research
 */
export function buildResearchPrompt(
  basePrompt: string,
  lead: Lead,
  outputPaths: CompanyResearchOutputPaths,
  companyContext?: string
): string {
  const whatWeDo = formatWhatWeDo(companyContext);
  const leadContext = formatLeadContext(lead);

  return `${whatWeDo}<TargetCompany>
${leadContext}
</TargetCompany>

<ResearchInstructions>
${basePrompt}
</ResearchInstructions>

<OutputRequirements>
Save your research to these files:
1. Company profile (markdown): ${outputPaths.companyProfile}
2. Key contacts (JSON array): ${outputPaths.people}

People JSON format:
[{"firstName": "...", "lastName": "...", "title": "...", "email": "... or null", "linkedinUrl": "... or null", "yearJoined": 2020 or null}]
</OutputRequirements>
`;
}

/**
 * Build a person research prompt
 *
 * @param basePrompt - The user-configured person research prompt from database
 * @param person - The person to research
 * @param lead - The associated company/lead
 * @param outputPath - Path where Claude should write the person profile
 * @param companyContext - Optional "what we do" context for the user's company
 * @returns Complete prompt string for person research
 */
export function buildPersonResearchPrompt(
  basePrompt: string,
  person: Person,
  lead: Lead,
  outputPath: string,
  companyContext?: string
): string {
  const whatWeDo = formatWhatWeDo(companyContext);
  const personContext = formatPersonContext(person, lead);
  const leadContext = formatLeadContext(lead);

  return `${whatWeDo}<TargetPerson>
${personContext}
</TargetPerson>

<TargetCompany>
${leadContext}
</TargetCompany>

<ResearchInstructions>
${basePrompt}
</ResearchInstructions>

<OutputRequirements>
Save the person profile to: ${outputPath}
Format: Markdown document with profile, background, and research findings.
</OutputRequirements>
`;
}
