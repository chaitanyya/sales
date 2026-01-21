/**
 * Hunter.io API client for email enrichment and verification
 */

const HUNTER_API_BASE = "https://api.hunter.io/v2";

function getApiKey(): string {
  const key = process.env.HUNTER_API_KEY;
  if (!key) {
    throw new Error("HUNTER_API_KEY environment variable is not set");
  }
  return key;
}

export interface EmailFinderResult {
  email: string | null;
  score: number;
  position: string | null;
  linkedin: string | null;
  twitter: string | null;
  phone_number: string | null;
  verification: {
    status: "valid" | "invalid" | "accept_all" | "webmail" | "disposable" | "unknown";
  } | null;
}

export interface EmailFinderResponse {
  data: EmailFinderResult;
  meta: {
    params: {
      domain: string;
      first_name: string;
      last_name: string;
    };
  };
}

export interface DomainSearchResult {
  domain: string;
  organization: string;
  emails: Array<{
    value: string;
    type: "personal" | "generic";
    confidence: number;
    first_name: string | null;
    last_name: string | null;
    position: string | null;
    linkedin: string | null;
    twitter: string | null;
    phone_number: string | null;
  }>;
}

export interface EmailVerifyResult {
  email: string;
  status: "valid" | "invalid" | "accept_all" | "webmail" | "disposable" | "unknown";
  score: number;
  regexp: boolean;
  gibberish: boolean;
  disposable: boolean;
  webmail: boolean;
  mx_records: boolean;
  smtp_server: boolean;
  smtp_check: boolean;
  accept_all: boolean;
  block: boolean;
}

/**
 * Find email for a person given their name and company domain
 */
export async function findEmail(
  domain: string,
  firstName: string,
  lastName: string
): Promise<EmailFinderResult | null> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    domain,
    first_name: firstName,
    last_name: lastName,
    api_key: apiKey,
  });

  try {
    const response = await fetch(`${HUNTER_API_BASE}/email-finder?${params}`);

    if (!response.ok) {
      const error = await response.json();
      console.error("Hunter.io email finder error:", error);
      return null;
    }

    const data: EmailFinderResponse = await response.json();
    return data.data;
  } catch (error) {
    console.error("Hunter.io request failed:", error);
    return null;
  }
}

/**
 * Verify an email address
 */
export async function verifyEmail(email: string): Promise<EmailVerifyResult | null> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    email,
    api_key: apiKey,
  });

  try {
    const response = await fetch(`${HUNTER_API_BASE}/email-verifier?${params}`);

    if (!response.ok) {
      const error = await response.json();
      console.error("Hunter.io email verifier error:", error);
      return null;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Hunter.io request failed:", error);
    return null;
  }
}

/**
 * Search for all emails at a domain
 */
export async function domainSearch(domain: string): Promise<DomainSearchResult | null> {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    domain,
    api_key: apiKey,
  });

  try {
    const response = await fetch(`${HUNTER_API_BASE}/domain-search?${params}`);

    if (!response.ok) {
      const error = await response.json();
      console.error("Hunter.io domain search error:", error);
      return null;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Hunter.io request failed:", error);
    return null;
  }
}

/**
 * Extract domain from a website URL
 */
export function extractDomain(website: string | null): string | null {
  if (!website) return null;

  try {
    // Add protocol if missing
    let url = website;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    // Try to extract domain without URL parsing
    return website
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .split("/")[0]
      .split("?")[0];
  }
}
