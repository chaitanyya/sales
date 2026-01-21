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
  const leadContext = formatLeadContext(lead, { includeHeader: true });

  return `${whatWeDo}${leadContext}

${basePrompt}

IMPORTANT: When you have completed your research, save the outputs to these files:
1. Company profile: ${outputPaths.companyProfile}
2. People: ${outputPaths.people}

For the people.json file, output a JSON array of objects with this structure:
[
  {
    "firstName": "First Name",
    "lastName": "Last Name",
    "title": "Job Title",
    "email": "email@company.com or null if unknown",
    "linkedinUrl": "https://linkedin.com/in/... or null if unknown",
    "yearJoined": 2020 or null if unknown
  }
]
Include key people at the company that you discovered during research.
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
  const personContext = formatPersonContext(person, lead, {
    includeHeader: true,
    includeCompanyContext: true,
  });

  return `${whatWeDo}${personContext}

${basePrompt}

IMPORTANT: When you have completed your research, save the person profile to this file:
${outputPath}

The file should be a markdown document containing the person's profile, background, experience, and any relevant information you discovered.
`;
}
