import type { Lead, Person } from "@/db/schema";
import { formatLeadContext, formatPersonContext, formatWhatWeDo } from "../formatters";

/**
 * Build a conversation topics prompt
 *
 * @param conversationTopicsPrompt - The user-configured conversation topics prompt
 * @param person - The person to generate conversation topics for
 * @param lead - The associated company/lead
 * @param outputPath - Path where Claude should write the conversation topics
 * @param companyOverviewContent - Optional "what we do" context for the user's company
 * @returns Complete prompt string for conversation topic generation
 */
export function buildConversationPrompt(
  conversationTopicsPrompt: string,
  person: Person,
  lead: Lead,
  outputPath: string,
  companyOverviewContent?: string
): string {
  const whatWeDo = formatWhatWeDo(companyOverviewContent);
  const personContext = formatPersonContext(person, lead);
  const leadContext = formatLeadContext(lead);

  return `${whatWeDo}CONTEXT - Person Information:
${personContext}

CONTEXT - Company Information:
${leadContext}

${conversationTopicsPrompt}

IMPORTANT: When you have completed generating conversation topics, save the output to this file:
${outputPath}

The file should be a markdown document containing conversation topics, talking points, and any relevant information for engaging with this person.
`;
}
