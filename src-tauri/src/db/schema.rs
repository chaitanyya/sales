use serde::{Deserialize, Serialize};

// ============================================================================
// Lead Table
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Lead {
    pub id: i64,
    pub company_name: String,
    pub website: Option<String>,
    pub industry: Option<String>,
    pub sub_industry: Option<String>,
    pub employees: Option<i64>,
    pub employee_range: Option<String>,
    pub revenue: Option<f64>,
    pub revenue_range: Option<String>,
    pub company_linkedin_url: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub country: Option<String>,
    pub research_status: String,
    pub researched_at: Option<i64>,
    pub user_status: String,
    pub created_at: i64,
    pub company_profile: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewLead {
    pub company_name: String,
    pub website: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub country: Option<String>,
}

// ============================================================================
// Person Table
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Person {
    pub id: i64,
    pub lead_id: Option<i64>,
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub title: Option<String>,
    pub management_level: Option<String>,
    pub linkedin_url: Option<String>,
    pub year_joined: Option<i64>,
    pub person_profile: Option<String>,
    pub research_status: String,
    pub researched_at: Option<i64>,
    pub user_status: String,
    pub conversation_topics: Option<String>,
    pub conversation_generated_at: Option<i64>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonWithCompany {
    pub id: i64,
    pub lead_id: Option<i64>,
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub title: Option<String>,
    pub management_level: Option<String>,
    pub linkedin_url: Option<String>,
    pub year_joined: Option<i64>,
    pub person_profile: Option<String>,
    pub research_status: String,
    pub researched_at: Option<i64>,
    pub user_status: String,
    pub conversation_topics: Option<String>,
    pub conversation_generated_at: Option<i64>,
    pub created_at: i64,
    pub company_name: Option<String>,
    pub company_website: Option<String>,
    pub company_industry: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewPerson {
    pub first_name: String,
    pub last_name: String,
    pub email: Option<String>,
    pub title: Option<String>,
    pub linkedin_url: Option<String>,
    pub lead_id: Option<i64>,
}

// ============================================================================
// Prompt Table
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Prompt {
    pub id: i64,
    #[serde(rename = "type")]
    pub prompt_type: String,
    pub content: String,
    pub created_at: i64,
    pub updated_at: i64,
}

// ============================================================================
// Scoring Config Table
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)] // Infrastructure for upcoming scoring feature
pub struct ScoringConfig {
    pub id: i64,
    pub name: String,
    pub is_active: bool,
    pub required_characteristics: String, // JSON
    pub demand_signifiers: String,        // JSON
    pub tier_hot_min: i64,
    pub tier_warm_min: i64,
    pub tier_nurture_min: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedScoringConfig {
    pub id: i64,
    pub name: String,
    pub is_active: bool,
    pub required_characteristics: serde_json::Value,
    pub demand_signifiers: serde_json::Value,
    pub tier_hot_min: i64,
    pub tier_warm_min: i64,
    pub tier_nurture_min: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

// ============================================================================
// Lead Scores Table
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)] // Infrastructure for upcoming scoring feature
pub struct LeadScore {
    pub id: i64,
    pub lead_id: i64,
    pub config_id: i64,
    pub passes_requirements: bool,
    pub requirement_results: String, // JSON
    pub total_score: i64,
    pub score_breakdown: String, // JSON
    pub tier: String,
    pub scoring_notes: Option<String>,
    pub scored_at: Option<i64>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedLeadScore {
    pub id: i64,
    pub lead_id: i64,
    pub config_id: i64,
    pub passes_requirements: bool,
    pub requirement_results: serde_json::Value,
    pub total_score: i64,
    pub score_breakdown: serde_json::Value,
    pub tier: String,
    pub scoring_notes: Option<String>,
    pub scored_at: Option<i64>,
    pub created_at: i64,
}

// ============================================================================
// Lead with Score
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LeadWithScore {
    #[serde(flatten)]
    pub lead: Lead,
    pub score: Option<ParsedLeadScore>,
}

// ============================================================================
// Job Table
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    pub id: String,
    pub job_type: String,
    pub entity_id: i64,
    pub entity_label: String,
    pub status: String,
    pub prompt: String,
    pub model: Option<String>,
    pub working_dir: String,
    pub output_path: Option<String>,
    pub exit_code: Option<i32>,
    pub error_message: Option<String>,
    pub created_at: i64,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub pid: Option<i64>,
    pub claude_session_id: Option<String>,
    pub claude_model: Option<String>,
    pub last_event_index: i64,
    // Stream statistics
    pub stdout_truncated: bool,
    pub stderr_truncated: bool,
    pub total_stdout_bytes: i64,
    pub total_stderr_bytes: i64,
    pub completion_state: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewJob {
    pub id: String,
    pub job_type: String,
    pub entity_id: i64,
    pub entity_label: String,
    pub prompt: String,
    pub model: Option<String>,
    pub working_dir: String,
    pub output_path: Option<String>,
}

// ============================================================================
// Job Log Table
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobLog {
    pub id: i64,
    pub job_id: String,
    pub log_type: String,
    pub content: String,
    pub tool_name: Option<String>,
    pub timestamp: i64,
    pub sequence: i64,
    pub source: String, // "stdout" | "stderr" | "internal"
}

// ============================================================================
// Settings Table
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub model: String,
    pub use_chrome: bool,
    pub use_glm_gateway: bool,
    pub theme: String,
    pub updated_at: i64,
}

// ============================================================================
// Org Binding Table (Single-Tenant)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrgBinding {
    pub org_id: String,
    pub org_name: String,
    pub bound_at: i64,
    pub bound_by_user_id: String,
    pub bound_by_user_email: String,
    pub machine_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MachineBinding {
    pub id: i64, // Always 1
    pub machine_id: String,
}

// ============================================================================
// Subscription State Table
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionState {
    pub id: i64,
    pub encrypted_token: String,
    pub subscription_status: String,    // "active", "past_due", "canceled", "expired"
    pub subscription_expires_at: Option<i64>,
    pub token_issued_at: i64,
    pub token_expires_at: i64,
    pub last_validated_at: i64,
    pub device_fingerprint: String,
    pub grace_period_ends_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionStatus {
    pub status: String,                    // "active", "past_due", "canceled", "expired"
    pub is_valid: bool,
    pub grace_period_ends_at: Option<i64>,
    pub days_until_lockout: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LockoutStatus {
    pub locked: bool,
    pub reason: Option<String>,
    pub grace_period_ends_at: Option<i64>,
}

// ============================================================================
// Note Table
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: i64,
    pub entity_type: String,
    pub entity_id: i64,
    pub content: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewNote {
    pub entity_type: String,
    pub entity_id: i64,
    pub content: String,
}

// ============================================================================
// Company Profile Table (User's company for onboarding)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyProfile {
    pub id: i64,
    pub company_name: String,
    pub product_name: String,
    pub website: String,
    pub target_audience: String,      // JSON: AudienceSegment[]
    pub usps: String,                  // JSON: USP[]
    pub marketing_narrative: String,   // Markdown
    pub sales_narrative: String,       // JSON: SalesNarrative
    pub competitors: String,           // JSON: Competitor[]
    pub market_insights: String,       // JSON: MarketInsight[]
    pub raw_analysis: String,          // Full AI output
    pub research_status: String,       // "pending" | "in_progress" | "completed" | "failed"
    pub researched_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewCompanyProfile {
    pub company_name: String,
    pub product_name: String,
    pub website: String,
}

