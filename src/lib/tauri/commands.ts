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
} from "./types";

// Helper to get clerkOrgId from auth store
function getClerkOrgId(): string | null {
  // This will be filled in by the calling code using useAuthStore
  return null;
}

// ============================================================================
// Lead Commands
// ============================================================================

export async function getLead(id: number, clerkOrgId?: string | null): Promise<Lead | null> {
  return invoke("get_lead", { id, clerkOrgId });
}

export async function getAllLeads(clerkOrgId?: string | null): Promise<Lead[]> {
  return invoke("get_all_leads", { clerkOrgId });
}

export async function getAdjacentLeads(currentId: number, clerkOrgId?: string | null): Promise<AdjacentResult> {
  return invoke("get_adjacent_leads", { currentId, clerkOrgId });
}

export async function insertLead(data: NewLead, clerkOrgId?: string | null): Promise<number> {
  return invoke("insert_lead", { data, clerkOrgId });
}

export async function updateLeadUserStatus(leadId: number, status: string, clerkOrgId?: string | null): Promise<void> {
  return invoke("update_lead_user_status", { leadId, status, clerkOrgId });
}

export async function deleteLeads(leadIds: number[], clerkOrgId?: string | null): Promise<number> {
  return invoke("delete_leads", { leadIds, clerkOrgId });
}

// ============================================================================
// Person Commands
// ============================================================================

export async function getPerson(id: number, clerkOrgId?: string | null): Promise<PersonWithCompany | null> {
  return invoke("get_person", { id, clerkOrgId });
}

export async function getPersonRaw(id: number, clerkOrgId?: string | null): Promise<Person | null> {
  return invoke("get_person_raw", { id, clerkOrgId });
}

export async function getPeopleForLead(leadId: number, clerkOrgId?: string | null): Promise<Person[]> {
  return invoke("get_people_for_lead", { leadId, clerkOrgId });
}

export async function getAllPeople(clerkOrgId?: string | null): Promise<PersonWithCompany[]> {
  return invoke("get_all_people", { clerkOrgId });
}

export async function getAdjacentPeople(currentId: number, clerkOrgId?: string | null): Promise<AdjacentResult> {
  return invoke("get_adjacent_people", { currentId, clerkOrgId });
}

export async function insertPerson(data: NewPerson, clerkOrgId?: string | null): Promise<number> {
  return invoke("insert_person", { data, clerkOrgId });
}

export async function updatePersonUserStatus(personId: number, status: string, clerkOrgId?: string | null): Promise<void> {
  return invoke("update_person_user_status", { personId, status, clerkOrgId });
}

export async function deletePeople(personIds: number[], clerkOrgId?: string | null): Promise<number> {
  return invoke("delete_people", { personIds, clerkOrgId });
}

// ============================================================================
// Prompt Commands
// ============================================================================

export async function getPromptByType(promptType: PromptType, clerkOrgId?: string | null): Promise<Prompt | null> {
  return invoke("get_prompt_by_type", { promptType, clerkOrgId });
}

export async function savePromptByType(promptType: PromptType, content: string, clerkOrgId?: string | null): Promise<number> {
  return invoke("save_prompt_by_type", { promptType, content, clerkOrgId });
}

// ============================================================================
// Company Overview Commands
// ============================================================================

export async function getCompanyOverview(clerkOrgId?: string | null): Promise<string | null> {
  const prompt = await getPromptByType("company_overview", clerkOrgId);
  return prompt?.content ?? null;
}

export async function saveCompanyOverview(content: string, clerkOrgId?: string | null): Promise<number> {
  return savePromptByType("company_overview", content, clerkOrgId);
}

// ============================================================================
// Onboarding Commands
// ============================================================================

export async function getOnboardingStatus(clerkOrgId?: string | null): Promise<OnboardingStatus> {
  return invoke("get_onboarding_status", { clerkOrgId });
}

// ============================================================================
// Scoring Config Commands
// ============================================================================

export async function getActiveScoringConfig(clerkOrgId?: string | null): Promise<ScoringConfig | null> {
  return invoke("get_active_scoring_config", { clerkOrgId });
}

export async function saveScoringConfig(
  name: string,
  requiredCharacteristics: string,
  demandSignifiers: string,
  tierHotMin: number,
  tierWarmMin: number,
  tierNurtureMin: number,
  clerkOrgId?: string | null,
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
    clerkOrgId,
  });
}

// ============================================================================
// Lead Score Commands
// ============================================================================

export async function getLeadScore(leadId: number, clerkOrgId?: string | null): Promise<LeadScore | null> {
  return invoke("get_lead_score", { leadId, clerkOrgId });
}

export async function getLeadsWithScores(clerkOrgId?: string | null): Promise<LeadWithScore[]> {
  return invoke("get_leads_with_scores", { clerkOrgId });
}

export async function getUnscoredLeads(clerkOrgId?: string | null): Promise<Lead[]> {
  return invoke("get_unscored_leads", { clerkOrgId });
}

export async function saveLeadScore(
  leadId: number,
  configId: number,
  passesRequirements: boolean,
  requirementResults: string,
  totalScore: number,
  scoreBreakdown: string,
  tier: string,
  scoringNotes?: string,
  clerkOrgId?: string | null
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
    clerkOrgId,
  });
}

export async function deleteLeadScore(leadId: number, clerkOrgId?: string | null): Promise<void> {
  return invoke("delete_lead_score", { leadId, clerkOrgId });
}

// ============================================================================
// Research Commands
// ============================================================================

export async function startResearch(
  leadId: number,
  onEvent: (event: StreamEvent) => void,
  customPrompt?: string,
  clerkOrgId?: string | null
): Promise<ResearchResult> {
  const channel = new Channel<StreamEvent>();
  channel.onmessage = onEvent;

  return invoke("start_research", {
    leadId,
    customPrompt,
    clerkOrgId,
    onEvent: channel,
  });
}

export async function startPersonResearch(
  personId: number,
  onEvent: (event: StreamEvent) => void,
  customPrompt?: string,
  clerkOrgId?: string | null
): Promise<ResearchResult> {
  const channel = new Channel<StreamEvent>();
  channel.onmessage = onEvent;

  return invoke("start_person_research", {
    personId,
    customPrompt,
    clerkOrgId,
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
  onEvent: (event: StreamEvent) => void,
  clerkOrgId?: string | null
): Promise<ResearchResult> {
  const channel = new Channel<StreamEvent>();
  channel.onmessage = onEvent;

  return invoke("start_scoring", {
    leadId,
    clerkOrgId,
    onEvent: channel,
  });
}

// ============================================================================
// Conversation Generation Commands
// ============================================================================

export async function startConversationGeneration(
  personId: number,
  onEvent: (event: StreamEvent) => void,
  clerkOrgId?: string | null
): Promise<ResearchResult> {
  const channel = new Channel<StreamEvent>();
  channel.onmessage = onEvent;

  return invoke("start_conversation_generation", {
    personId,
    clerkOrgId,
    onEvent: channel,
  });
}

// ============================================================================
// Job Commands
// ============================================================================

export async function getJobsActive(clerkOrgId?: string | null): Promise<Job[]> {
  return invoke("get_jobs_active", { clerkOrgId });
}

export async function getJobsRecent(limit?: number, clerkOrgId?: string | null): Promise<Job[]> {
  return invoke("get_jobs_recent", { limit, clerkOrgId });
}

export async function getJobById(jobId: string, clerkOrgId?: string | null): Promise<Job | null> {
  return invoke("get_job_by_id", { jobId, clerkOrgId });
}

export async function getJobLogs(
  jobId: string,
  afterSequence?: number,
  limit?: number,
  clerkOrgId?: string | null
): Promise<JobLog[]> {
  return invoke("get_job_logs_cmd", { jobId, afterSequence, limit, clerkOrgId });
}

export async function cleanupOldJobs(days?: number, clerkOrgId?: string | null): Promise<number> {
  return invoke("cleanup_old_jobs_cmd", { days, clerkOrgId });
}

export async function deleteJob(jobId: string, clerkOrgId?: string | null): Promise<void> {
  return invoke("delete_job_cmd", { jobId, clerkOrgId });
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

export interface Settings {
  model: string;
  useChrome: boolean;
  useGlmGateway: boolean;
  updatedAt: number;
}

export async function getSettings(): Promise<Settings> {
  return invoke("get_settings");
}

export async function updateSettings(
  model: string,
  useChrome: boolean,
  useGlmGateway: boolean
): Promise<void> {
  return invoke("update_settings", {
    model,
    use_chrome: useChrome,
    use_glm_gateway: useGlmGateway,
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
