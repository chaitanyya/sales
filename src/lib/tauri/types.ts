// ============================================================================
// Lead Types
// ============================================================================

export interface Lead {
  id: number;
  companyName: string;
  website: string | null;
  industry: string | null;
  subIndustry: string | null;
  employees: number | null;
  employeeRange: string | null;
  revenue: number | null;
  revenueRange: string | null;
  companyLinkedinUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  researchStatus: "pending" | "in_progress" | "completed" | "failed";
  researchedAt: number | null;
  userStatus: string;
  createdAt: number;
  companyProfile: string | null;
}

export interface NewLead {
  companyName: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
}

// ============================================================================
// Person Types
// ============================================================================

export interface Person {
  id: number;
  leadId: number | null;
  firstName: string;
  lastName: string;
  email: string | null;
  title: string | null;
  managementLevel: string | null;
  linkedinUrl: string | null;
  yearJoined: number | null;
  personProfile: string | null;
  researchStatus: "pending" | "in_progress" | "completed" | "failed";
  researchedAt: number | null;
  userStatus: string;
  conversationTopics: string | null;
  conversationGeneratedAt: number | null;
  createdAt: number;
}

export interface PersonWithCompany extends Person {
  companyName: string | null;
  companyWebsite: string | null;
  companyIndustry: string | null;
}

export interface NewPerson {
  firstName: string;
  lastName: string;
  email?: string;
  title?: string;
  linkedinUrl?: string;
  leadId?: number;
}

// ============================================================================
// Prompt Types
// ============================================================================

export interface Prompt {
  id: number;
  type: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export type PromptType = "company" | "person" | "company_overview" | "conversation_topics";

// ============================================================================
// Scoring Types
// ============================================================================

export type ScoringTier = "hot" | "warm" | "nurture" | "disqualified";

export interface RequiredCharacteristic {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface DemandSignifier {
  id: string;
  name: string;
  description: string;
  weight: number;
  enabled: boolean;
}

export interface RequirementResult {
  id: string;
  name: string;
  passed: boolean;
  reason: string;
}

export interface SignifierScore {
  id: string;
  name: string;
  weight: number;
  score: number;
  weightedScore: number;
  reason: string;
}

export interface ScoringConfig {
  id: number;
  name: string;
  isActive: boolean;
  requiredCharacteristics: RequiredCharacteristic[];
  demandSignifiers: DemandSignifier[];
  tierHotMin: number;
  tierWarmMin: number;
  tierNurtureMin: number;
  createdAt: number;
  updatedAt: number;
}

export interface LeadScore {
  id: number;
  leadId: number;
  configId: number;
  passesRequirements: boolean;
  requirementResults: RequirementResult[];
  totalScore: number;
  scoreBreakdown: SignifierScore[];
  tier: ScoringTier;
  scoringNotes: string | null;
  scoredAt: number | null;
  createdAt: number;
}

export interface LeadWithScore {
  id: number;
  companyName: string;
  website: string | null;
  industry: string | null;
  subIndustry: string | null;
  employees: number | null;
  employeeRange: string | null;
  revenue: number | null;
  revenueRange: string | null;
  companyLinkedinUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  researchStatus: "pending" | "in_progress" | "completed" | "failed";
  researchedAt: number | null;
  userStatus: string;
  createdAt: number;
  companyProfile: string | null;
  score: LeadScore | null;
}

// ============================================================================
// Research Types
// ============================================================================

export interface StreamEvent {
  jobId: string;
  eventType: string;
  content: string;
  timestamp: number;
}

export interface ResearchResult {
  jobId: string;
  status: string;
}

// ============================================================================
// Navigation Types
// ============================================================================

export interface AdjacentResult {
  prevLead: number | null;
  nextLead: number | null;
  currentIndex: number;
  total: number;
}

// ============================================================================
// Onboarding Types
// ============================================================================

export interface OnboardingStatus {
  hasCompanyOverview: boolean;
  hasCompanyProfile: boolean;
  hasLead: boolean;
  hasResearchedLead: boolean;
  hasScoredLead: boolean;
  hasResearchedPerson: boolean;
  hasConversationTopics: boolean;
}

// ============================================================================
// Job Types
// ============================================================================

export type JobType = "company_research" | "person_research" | "scoring" | "conversation" | "company_profile_research";
export type JobStatus = "queued" | "running" | "completed" | "error" | "timeout" | "cancelled";

export interface Job {
  id: string;
  jobType: JobType;
  entityId: number;
  entityLabel: string;
  status: JobStatus;
  prompt: string;
  model: string | null;
  workingDir: string;
  outputPath: string | null;
  exitCode: number | null;
  errorMessage: string | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  pid: number | null;
  claudeSessionId: string | null;
  claudeModel: string | null;
  lastEventIndex: number;
  // Stream statistics
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  totalStdoutBytes: number;
  totalStderrBytes: number;
  completionState: string | null;
}

export interface JobLog {
  id: number;
  jobId: string;
  logType: string;
  content: string;
  toolName: string | null;
  timestamp: number;
  sequence: number;
  source: "stdout" | "stderr" | "internal";
}

// ============================================================================
// Recovery Types
// ============================================================================

export interface StaleJob {
  id: string;
  jobType: JobType;
  entityId: number;
  entityLabel: string;
  status: JobStatus;
  startedAt: number | null;
  createdAt: number;
}

export interface StuckEntity {
  id: number;
  name: string;
  entityType: "lead" | "person";
  status: string;
}

export interface StaleJobsResult {
  staleJobs: StaleJob[];
  stuckLeads: StuckEntity[];
  stuckPeople: StuckEntity[];
}

// ============================================================================
// Org Binding Types (Single-Tenant)
// ============================================================================

export interface OrgBinding {
  orgId: string;
  orgName: string;
  boundAt: number;
  boundByUserId: string;
  boundByUserEmail: string;
  machineId: string;
}

// ============================================================================
// Bulk Upload Types
// ============================================================================

export interface BulkUploadResult {
  successCount: number;
  errorCount: number;
  errors: string[];
}


// ============================================================================
// Note Types
// ============================================================================

export interface Note {
  id: number;
  entityType: string;
  entityId: number;
  content: string;
  createdAt: number;
}

// ============================================================================
// Company Profile Types (User's company for onboarding)
// ============================================================================

export type AudienceSegmentType = "primary" | "secondary";

export interface AudienceSegment {
  id: string;
  type: AudienceSegmentType;
  segment: string;
  description: string;
  indicators: string[];
}

export interface USP {
  id: string;
  headline: string;
  explanation: string;
  evidence?: string[];
  order: number;
}

export type TalkingPointCategory = "problem" | "solution" | "social-proof" | "cta" | "custom";

export interface TalkingPoint {
  id: string;
  category: TalkingPointCategory;
  content: string;
  order: number;
}

export interface SalesNarrative {
  elevatorPitch: string;
  talkingPoints: TalkingPoint[];
}

export type CompetitorType = "direct" | "indirect" | "alternative";

export interface Competitor {
  id: string;
  name: string;
  type: CompetitorType;
  website?: string;
  strengths?: string[];
  weaknesses?: string[];
  differentiation?: string;
}

export type InsightCategory = "trends" | "challenges" | "opportunities" | "timing" | "regulation" | "other";

export interface MarketInsight {
  id: string;
  category: InsightCategory;
  content: string;
  relevance?: string;
  order: number;
}

export type CompanyProfileResearchStatus = "pending" | "in_progress" | "completed" | "failed";

export interface CompanyProfile {
  id: number;
  companyName: string;
  productName: string;
  website: string;
  targetAudience: string; // JSON string of AudienceSegment[]
  usps: string; // JSON string of USP[]
  marketingNarrative: string; // Markdown
  salesNarrative: string; // JSON string of SalesNarrative
  competitors: string; // JSON string of Competitor[]
  marketInsights: string; // JSON string of MarketInsight[]
  rawAnalysis: string; // Full AI output
  researchStatus: CompanyProfileResearchStatus;
  researchedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface NewCompanyProfile {
  companyName: string;
  productName: string;
  website: string;
}

export interface ParsedCompanyProfile {
  id: number;
  companyName: string;
  productName: string;
  website: string;
  targetAudience: AudienceSegment[];
  usps: USP[];
  marketingNarrative: string;
  salesNarrative: SalesNarrative;
  competitors: Competitor[];
  marketInsights: MarketInsight[];
  rawAnalysis: string;
  researchStatus: CompanyProfileResearchStatus;
  researchedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
