import type { Lead, Person } from "@/db/schema";

/**
 * Lead with optional people array for scoring context
 */
export interface LeadWithPeople extends Lead {
  people: Person[];
}

/**
 * Options for formatting lead context
 */
export interface FormatLeadOptions {
  /** Add "CONTEXT - Company Information:" header */
  includeHeader?: boolean;
  /** Include company profile if available */
  includeProfile?: boolean;
  /** Include people list if available */
  includePeople?: boolean;
}

/**
 * Format company/lead information for prompts
 *
 * @param lead - The lead object (with optional people array)
 * @param options - Formatting options
 * @returns Formatted string with company information
 */
export function formatLeadContext(
  lead: Lead | LeadWithPeople,
  options: FormatLeadOptions = {}
): string {
  const {
    includeHeader = false,
    includeProfile = false,
    includePeople = false,
  } = options;

  const header = includeHeader ? "CONTEXT - Company Information:\n" : "";

  const parts = [
    `Company Name: ${lead.companyName}`,
    `Website: ${lead.website || "N/A"}`,
    `Industry: ${lead.industry || "N/A"}`,
    `Sub-Industry: ${lead.subIndustry || "N/A"}`,
    `Employees: ${lead.employees || "N/A"}`,
    `Employee Range: ${lead.employeeRange || "N/A"}`,
    `Revenue: ${lead.revenue || "N/A"}`,
    `Revenue Range: ${lead.revenueRange || "N/A"}`,
    `LinkedIn: ${lead.companyLinkedinUrl || "N/A"}`,
    `City: ${lead.city || "N/A"}`,
    `State: ${lead.state || "N/A"}`,
    `Country: ${lead.country || "N/A"}`,
  ];

  if (includeProfile && lead.companyProfile) {
    parts.push(`\nCompany Research Profile:\n${lead.companyProfile}`);
  }

  if (includePeople && "people" in lead && lead.people.length > 0) {
    parts.push(`\nKey People (${lead.people.length}):`);
    for (const person of lead.people) {
      const name = `${person.firstName} ${person.lastName}`;
      const title = person.title || "Unknown title";
      const email = person.email || "No email";
      const linkedin = person.linkedinUrl || "No LinkedIn";
      parts.push(`  - ${name}, ${title} (${email}, ${linkedin})`);
      if (person.personProfile) {
        parts.push(`    Profile: ${person.personProfile.slice(0, 200)}...`);
      }
    }
  }

  return header + parts.join("\n");
}

/**
 * Options for formatting person context
 */
export interface FormatPersonOptions {
  /** Add "CONTEXT - Person Information:" header */
  includeHeader?: boolean;
  /** Include the company context after person info */
  includeCompanyContext?: boolean;
}

/**
 * Format person information for prompts
 *
 * @param person - The person object
 * @param lead - The associated lead/company
 * @param options - Formatting options
 * @returns Formatted string with person information
 */
export function formatPersonContext(
  person: Person,
  lead: Lead,
  options: FormatPersonOptions = {}
): string {
  const {
    includeHeader = false,
    includeCompanyContext = false,
  } = options;

  const header = includeHeader ? "CONTEXT - Person Information:\n" : "";

  const parts = [
    `Name: ${person.firstName} ${person.lastName}`,
    `Title: ${person.title || "N/A"}`,
    `Email: ${person.email || "N/A"}`,
    `LinkedIn: ${person.linkedinUrl || "N/A"}`,
    `Management Level: ${person.managementLevel || "N/A"}`,
    `Year Joined: ${person.yearJoined || "N/A"}`,
  ];

  let result = header + parts.join("\n");

  if (includeCompanyContext) {
    result += "\n\n" + formatLeadContext(lead, { includeHeader: true });
  }

  return result;
}

/**
 * Wrap content in a WhatWeDo XML tag for company context
 */
export function formatWhatWeDo(content: string | undefined | null): string {
  if (!content) return "";
  return `<WhatWeDo>
${content}
</WhatWeDo>

`;
}
