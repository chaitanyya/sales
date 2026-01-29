import { invoke, Channel } from "@tauri-apps/api/core";
import type {
  Lead,
  NewLead,
  Person,
  PersonWithCompany,
  NewPerson,
  Prompt,
  PromptType,
  ScoringConfig,
  LeadScore,
  LeadWithScore,
  StreamEvent,
  ResearchResult,
  AdjacentResult,
  OnboardingStatus,
  Job,
  JobLog,
  BulkUploadResult,
  Note,
  CompanyProfile,
  ParsedCompanyProfile,
} from "./types";

// ============================================================================
// Lead Commands
// ============================================================================

export async function getLead(id: number): Promise<Lead | null> {
  return invoke("get_lead", { id });
}

export async function getAllLeads(): Promise<Lead[]> {
  return invoke("get_all_leads");
}

export async function getAdjacentLeads(currentId: number): Promise<AdjacentResult> {
  return invoke("get_adjacent_leads", { currentId });
}

export async function insertLead(data: NewLead): Promise<number> {
  return invoke("insert_lead", { data });
}

export async function updateLeadUserStatus(leadId: number, status: string): Promise<void> {
  return invoke("update_lead_user_status", { leadId, status });
}

export async function deleteLeads(leadIds: number[]): Promise<number> {
  return invoke("delete_leads", { leadIds });
}

export async function insertLeadsBulk(leads: NewLead[]): Promise<BulkUploadResult> {
  return invoke("insert_leads_bulk", { leads });
}

export async function insertPeopleBulk(people: NewPerson[]): Promise<BulkUploadResult> {
  return invoke("insert_people_bulk", { people });
}

// ============================================================================
// Person Commands
// ============================================================================

export async function getPerson(id: number): Promise<PersonWithCompany | null> {
  return invoke("get_person", { id });
}

export async function getPersonRaw(id: number): Promise<Person | null> {
  return invoke("get_person_raw", { id });
}

export async function getPeopleForLead(leadId: number): Promise<Person[]> {
  return invoke("get_people_for_lead", { leadId });
}

export async function getAllPeople(): Promise<PersonWithCompany[]> {
  return invoke("get_all_people");
}

export async function getAdjacentPeople(currentId: number): Promise<AdjacentResult> {
  return invoke("get_adjacent_people", { currentId });
}

export async function insertPerson(data: NewPerson): Promise<number> {
  return invoke("insert_person", { data });
}

export async function updatePersonUserStatus(personId: number, status: string): Promise<void> {
  return invoke("update_person_user_status", { personId, status });
}

export async function deletePeople(personIds: number[]): Promise<number> {
  return invoke("delete_people", { personIds });
}

// ============================================================================
// Prompt Commands
// ============================================================================

export async function getPromptByType(promptType: PromptType): Promise<Prompt | null> {
  return invoke("get_prompt_by_type", { promptType });
}

export async function savePromptByType(promptType: PromptType, content: string): Promise<number> {
  return invoke("save_prompt_by_type", { promptType, content });
}

// ============================================================================
// Company Overview Commands
// ============================================================================

export async function getCompanyOverview(): Promise<string | null> {
  const prompt = await getPromptByType("company_overview");
  return prompt?.content ?? null;
}

export async function saveCompanyOverview(content: string): Promise<number> {
  return savePromptByType("company_overview", content);
}

// ============================================================================
// Onboarding Commands
// ============================================================================

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  return invoke("get_onboarding_status");
}

// ============================================================================
// Company Profile Commands (User's company for onboarding)
// ============================================================================

export async function getCompanyProfile(): Promise<CompanyProfile | null> {
  return invoke("get_company_profile");
}

export async function saveCompanyProfile(params: {
  companyName: string;
  productName: string;
  website: string;
  targetAudience?: string;
  usps?: string;
  marketingNarrative?: string;
  salesNarrative?: string;
  competitors?: string;
  marketInsights?: string;
  rawAnalysis?: string;
  researchStatus?: string;
}): Promise<number> {
  return invoke("save_company_profile", { ...params });
}

export async function updateCompanyProfileResearchStatus(researchStatus: string): Promise<void> {
  return invoke("update_company_profile_research_status", { researchStatus });
}

export async function startCompanyProfileResearch(
  companyName: string,
  productName: string,
  website: string,
  onEvent: (event: StreamEvent) => void
): Promise<ResearchResult> {
  const channel = new Channel<StreamEvent>();
  channel.onmessage = onEvent;
  return invoke("start_company_profile_research", {
    companyName,
    productName,
    website,
    onEvent: channel,
  });
}

// ============================================================================
// Scoring Config Commands
// ============================================================================

export async function getActiveScoringConfig(): Promise<ScoringConfig | null> {
  return invoke("get_active_scoring_config");
}

export async function saveScoringConfig(
  name: string,
  requiredCharacteristics: string,
  demandSignifiers: string,
  tierHotMin: number,
  tierWarmMin: number,
  tierNurtureMin: number,
  id?: number
): Promise<number> {
  return invoke("save_scoring_config", {
    name,
    requiredCharacteristics,
    demandSignifiers,
    tierHotMin,
    tierWarmMin,
    tierNurtureMin,
    id,
  });
}

// ============================================================================
// Lead Score Commands
// ============================================================================

export async function getLeadScore(leadId: number): Promise<LeadScore | null> {
  return invoke("get_lead_score", { leadId });
}

export async function getLeadsWithScores(): Promise<LeadWithScore[]> {
  return invoke("get_leads_with_scores");
}

export async function getUnscoredLeads(): Promise<Lead[]> {
  return invoke("get_unscored_leads");
}

export async function saveLeadScore(
  leadId: number,
  configId: number,
  passesRequirements: boolean,
  requirementResults: string,
  totalScore: number,
  scoreBreakdown: string,
  tier: string,
  scoringNotes?: string
): Promise<number> {
  return invoke("save_lead_score", {
    leadId,
    configId,
    passesRequirements,
    requirementResults,
    totalScore,
    scoreBreakdown,
    tier,
    scoringNotes,
  });
}

export async function deleteLeadScore(leadId: number): Promise<void> {
  return invoke("delete_lead_score", { leadId });
}

// ============================================================================
// Research Commands
// ============================================================================

export async function startResearch(
  leadId: number,
  onEvent: (event: StreamEvent) => void,
  customPrompt?: string
): Promise<ResearchResult> {
  const channel = new Channel<StreamEvent>();
  channel.onmessage = onEvent;

  return invoke("start_research", {
    leadId,
    customPrompt,
    onEvent: channel,
  });
}

export async function startPersonResearch(
  personId: number,
  onEvent: (event: StreamEvent) => void,
  customPrompt?: string
): Promise<ResearchResult> {
  const channel = new Channel<StreamEvent>();
  channel.onmessage = onEvent;

  return invoke("start_person_research", {
    personId,
    customPrompt,
    onEvent: channel,
  });
}

export async function killJob(jobId: string): Promise<void> {
  return invoke("kill_job", { jobId });
}

export async function getActiveJobs(): Promise<string[]> {
  return invoke("get_active_jobs");
}

// ============================================================================
// Scoring Commands
// ============================================================================

export async function startScoring(
  leadId: number,
  onEvent: (event: StreamEvent) => void
): Promise<ResearchResult> {
  const channel = new Channel<StreamEvent>();
  channel.onmessage = onEvent;

  return invoke("start_scoring", {
    leadId,
    onEvent: channel,
  });
}

// ============================================================================
// Conversation Generation Commands
// ============================================================================

export async function startConversationGeneration(
  personId: number,
  onEvent: (event: StreamEvent) => void
): Promise<ResearchResult> {
  const channel = new Channel<StreamEvent>();
  channel.onmessage = onEvent;

  return invoke("start_conversation_generation", {
    personId,
    onEvent: channel,
  });
}

// ============================================================================
// Job Commands
// ============================================================================

export async function getJobsActive(): Promise<Job[]> {
  return invoke("get_jobs_active");
}

export async function getJobsRecent(limit?: number): Promise<Job[]> {
  return invoke("get_jobs_recent", { limit });
}

export async function getJobById(jobId: string): Promise<Job | null> {
  return invoke("get_job_by_id", { jobId });
}

export async function getJobLogs(
  jobId: string,
  afterSequence?: number,
  limit?: number
): Promise<JobLog[]> {
  return invoke("get_job_logs_cmd", { jobId, afterSequence, limit });
}

export async function cleanupOldJobs(days?: number): Promise<number> {
  return invoke("cleanup_old_jobs_cmd", { days });
}

export async function deleteJob(jobId: string): Promise<void> {
  return invoke("delete_job_cmd", { jobId });
}

// ============================================================================
// Recovery Commands
// ============================================================================

import type { StaleJobsResult } from "./types";

export async function getStuckEntities(): Promise<StaleJobsResult> {
  return invoke("get_stuck_entities");
}

export async function resetEntityStatus(
  entityType: "lead" | "person",
  entityId: number,
  newStatus: string
): Promise<void> {
  return invoke("reset_entity_status", { entityType, entityId, newStatus });
}

export async function recoverAllStuck(): Promise<number> {
  return invoke("recover_all_stuck");
}

// ============================================================================
// Settings Commands
// ============================================================================

export type Theme = "light" | "dark" | "system";

export interface Settings {
  model: string;
  useChrome: boolean;
  useGlmGateway: boolean;
  theme: Theme;
  updatedAt: number;
}

export async function getSettings(): Promise<Settings> {
  return invoke("get_settings");
}

export async function updateSettings(
  model: string,
  useChrome: boolean,
  useGlmGateway: boolean,
  theme: Theme
): Promise<void> {
  return invoke("update_settings", {
    model,
    useChrome,
    useGlmGateway,
    theme,
  });
}

// ============================================================================
// Subscription Commands
// ============================================================================

export interface SubscriptionStatus {
  status: string;
  isValid: boolean;
  gracePeriodEndsAt: number | null;
  daysUntilLockout: number | null;
}

export interface LockoutStatus {
  locked: boolean;
  reason: string | null;
  gracePeriodEndsAt: number | null;
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return invoke("get_subscription_status");
}

export async function checkLockout(): Promise<LockoutStatus> {
  return invoke("check_lockout");
}

export async function validateSubscriptionToken(
  token: string,
  subscriptionStatus: string,
  subscriptionExpiresAt?: number
): Promise<void> {
  return invoke("validate_subscription_token", {
    token,
    subscriptionStatus,
    subscriptionExpiresAt,
  });
}

export async function updateSubscriptionStatus(
  subscriptionStatus: string,
  subscriptionExpiresAt?: number
): Promise<void> {
  return invoke("update_subscription_status", {
    subscriptionStatus,
    subscriptionExpiresAt,
  });
}

export async function clearSubscriptionState(): Promise<void> {
  return invoke("clear_subscription_state");
}

// ============================================================================
// Org Binding Commands (Single-Tenant)
// ============================================================================

import type { OrgBinding } from "./types";

export async function getOrgBinding(): Promise<OrgBinding | null> {
  return invoke("get_org_binding");
}

export async function bindOrg(
  orgId: string,
  orgName: string,
  userId: string,
  userEmail: string
): Promise<OrgBinding> {
  return invoke("bind_org", {
    orgId,
    orgName,
    userId,
    userEmail,
  });
}

export async function changeOrgBinding(
  newOrgId: string,
  newOrgName: string,
  userId: string,
  userEmail: string,
  confirmWipe: boolean
): Promise<OrgBinding> {
  return invoke("change_org_binding", {
    newOrgId,
    newOrgName,
    userId,
    userEmail,
    confirmWipe,
  });
}

export async function verifyMachineBinding(): Promise<boolean> {
  return invoke("verify_machine_binding");
}

export async function getMachineId(): Promise<string> {
  return invoke("get_machine_id");
}

export async function isOrgBound(): Promise<boolean> {
  return invoke("is_org_bound");
}

// ============================================================================
// Storage Commands (for Clerk auth)
// ============================================================================

export async function storageGet(key: string): Promise<string | null> {
  return invoke("storage_get", { key });
}

export async function storageSet(key: string, value: string): Promise<void> {
  return invoke("storage_set", { key, value });
}

export async function storageRemove(key: string): Promise<void> {
  return invoke("storage_remove", { key });
}

export async function storageClear(): Promise<void> {
  return invoke("storage_clear");
}

export async function storageKeys(): Promise<string[]> {
  return invoke("storage_keys");
}

// ============================================================================
// Note Commands
// ============================================================================

export async function addNote(
  entityType: string,
  entityId: number,
  content: string
): Promise<number> {
  return invoke("add_note", { entityType, entityId, content });
}

export async function getNotes(
  entityType: string,
  entityId: number
): Promise<Note[]> {
  return invoke("get_notes", { entityType, entityId });
}

export async function updateNote(
  id: number,
  content: string
): Promise<void> {
  return invoke("update_note", { id, content });
}

export async function deleteNote(
  id: number
): Promise<void> {
  return invoke("delete_note", { id });
}
