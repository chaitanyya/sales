use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// The type of job that was executed
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum JobType {
    CompanyResearch,
    PersonResearch,
    Scoring,
    Conversation,
}

/// Metadata about a job for tracking, including output file paths
#[derive(Debug, Clone)]
pub struct JobMetadata {
    pub job_type: JobType,
    pub entity_id: i64,
    /// For CompanyResearch: company_profile.md path
    /// For PersonResearch: person_profile.md path
    /// For Scoring: score.json path
    /// For Conversation: conversation.md path
    pub primary_output_path: PathBuf,
    /// For CompanyResearch: people.json path (optional for other types)
    pub secondary_output_path: Option<PathBuf>,
    /// For CompanyResearch/PersonResearch: enrichment.json path for structured data
    pub enrichment_output_path: Option<PathBuf>,
}

