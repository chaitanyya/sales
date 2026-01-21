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

  return `${whatWeDo}<TargetPerson>
${personContext}
</TargetPerson>

<TargetCompany>
${leadContext}
</TargetCompany>

<ConversationInstructions>
${conversationTopicsPrompt}
</ConversationInstructions>

<OutputRequirements>
Save conversation topics to: ${outputPath}
Format: Markdown document with talking points and engagement strategies.
</OutputRequirements>
`;
}
