/**
 * Prompt utilities module
 *
 * Consolidates all prompt templates, builders, and formatting utilities
 * for agent/Claude interactions.
 */

// Formatters - shared context formatting functions
export {
  formatLeadContext,
  formatPersonContext,
  formatWhatWeDo,
  type LeadWithPeople,
  type FormatLeadOptions,
  type FormatPersonOptions,
} from "./formatters";

// Builders - prompt construction functions
export { buildScoringPrompt } from "./builders/scoring";
export {
  buildResearchPrompt,
  buildPersonResearchPrompt,
  type CompanyResearchOutputPaths,
} from "./builders/research";
export { buildConversationPrompt } from "./builders/conversation";
