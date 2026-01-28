//! Completion handler for processing job results atomically
//!
//! This module handles the completion of jobs with proper error handling
//! and atomic operations. It processes job results in phases:
//! 1. Verify output files exist and are readable
//! 2. Parse and validate content
//! 3. Update database records (in a transaction)
//! 4. Cleanup output files only after DB is confirmed
//! 5. Record completion state for recovery

use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::AppHandle;
use serde::{Deserialize, Serialize};

use crate::db;
use crate::events;
use super::enrichment::{LeadEnrichment, PersonEnrichment};
use super::result_parser::{JobMetadata, JobType};
use super::stream_processor::CompletionContext;

/// Completion phases for recovery tracking
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CompletionPhase {
    Started,
    FilesVerified,
    ContentParsed,
    DatabaseUpdated,
    FilesCleanedUp,
    Completed,
    Failed,
}

/// Error types for completion handling
#[derive(Debug)]
pub enum CompletionError {
    FileNotFound(PathBuf),
    FileReadError(PathBuf, std::io::Error),
    ParseError(String),
    DatabaseError(String),
    ValidationError(String),
}

impl std::fmt::Display for CompletionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CompletionError::FileNotFound(path) => write!(f, "Output file not found: {:?}", path),
            CompletionError::FileReadError(path, e) => write!(f, "Failed to read {:?}: {}", path, e),
            CompletionError::ParseError(msg) => write!(f, "Parse error: {}", msg),
            CompletionError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            CompletionError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
        }
    }
}

/// Verified output files
pub struct VerifiedOutputs {
    pub primary_content: String,
    pub secondary_content: Option<String>,
    pub enrichment_content: Option<String>,
}

/// Parsed output content based on job type
pub enum ParsedOutput {
    CompanyResearch {
        profile: String,
        people: Option<Vec<serde_json::Value>>,
        enrichment: Option<LeadEnrichment>,
    },
    PersonResearch {
        profile: String,
        enrichment: Option<PersonEnrichment>,
    },
    Scoring {
        score_data: serde_json::Value,
    },
    Conversation {
        topics: String,
    },
}

/// Handles job completion with atomic operations
pub struct CompletionHandler {
    db_conn: Arc<std::sync::Mutex<rusqlite::Connection>>,
    app_handle: AppHandle,
}

impl CompletionHandler {
    pub fn new(
        db_conn: Arc<std::sync::Mutex<rusqlite::Connection>>,
        app_handle: AppHandle,
    ) -> Self {
        Self { db_conn, app_handle }
    }

    /// Process job completion through all phases
    pub fn process_completion(
        &self,
        ctx: &CompletionContext,
        metadata: &JobMetadata,
    ) -> Result<(), CompletionError> {
        // Update completion state: started
        self.update_completion_state(&ctx.job_id, CompletionPhase::Started);

        // If job failed, mark entity as failed and return early
        if !ctx.success {
            self.mark_entity_failed(metadata);
            self.update_completion_state(&ctx.job_id, CompletionPhase::Failed);
            return Ok(());
        }

        // Phase 1: Verify output files
        let outputs = self.verify_output_files(metadata)?;
        self.update_completion_state(&ctx.job_id, CompletionPhase::FilesVerified);

        // Phase 2: Parse and validate content
        let parsed = self.parse_output_content(&outputs, metadata)?;
        self.update_completion_state(&ctx.job_id, CompletionPhase::ContentParsed);

        // Phase 3: Update database
        self.update_database(&parsed, metadata)?;
        self.update_completion_state(&ctx.job_id, CompletionPhase::DatabaseUpdated);

        // Phase 4: Cleanup files (only after DB confirmed)
        self.cleanup_files(metadata)?;
        self.update_completion_state(&ctx.job_id, CompletionPhase::FilesCleanedUp);

        // Phase 5: Emit events and mark complete
        self.emit_completion_events(metadata);
        self.update_completion_state(&ctx.job_id, CompletionPhase::Completed);

        Ok(())
    }

    /// Verify that output files exist and are readable
    fn verify_output_files(&self, metadata: &JobMetadata) -> Result<VerifiedOutputs, CompletionError> {
        let primary_path = &metadata.primary_output_path;

        // Check primary file exists
        if !primary_path.exists() {
            return Err(CompletionError::FileNotFound(primary_path.clone()));
        }

        // Read primary content
        let primary_content = fs::read_to_string(primary_path)
            .map_err(|e| CompletionError::FileReadError(primary_path.clone(), e))?;

        // Validate primary content is not empty
        if primary_content.trim().is_empty() {
            return Err(CompletionError::ValidationError(
                format!("Primary output file is empty: {:?}", primary_path)
            ));
        }

        // Read secondary content if path provided
        let secondary_content = if let Some(secondary_path) = &metadata.secondary_output_path {
            if secondary_path.exists() {
                Some(fs::read_to_string(secondary_path)
                    .map_err(|e| CompletionError::FileReadError(secondary_path.clone(), e))?)
            } else {
                None
            }
        } else {
            None
        };

        // Read enrichment content if path provided (optional, don't fail if missing)
        let enrichment_content = if let Some(enrichment_path) = &metadata.enrichment_output_path {
            if enrichment_path.exists() {
                match fs::read_to_string(enrichment_path) {
                    Ok(content) => Some(content),
                    Err(e) => {
                        eprintln!("[completion_handler] Warning: Failed to read enrichment file {:?}: {}", enrichment_path, e);
                        None
                    }
                }
            } else {
                None
            }
        } else {
            None
        };

        Ok(VerifiedOutputs {
            primary_content,
            secondary_content,
            enrichment_content,
        })
    }

    /// Parse output content based on job type
    fn parse_output_content(
        &self,
        outputs: &VerifiedOutputs,
        metadata: &JobMetadata,
    ) -> Result<ParsedOutput, CompletionError> {
        match metadata.job_type {
            JobType::CompanyResearch => {
                let people = if let Some(ref people_json) = outputs.secondary_content {
                    match serde_json::from_str::<Vec<serde_json::Value>>(people_json) {
                        Ok(p) => Some(p),
                        Err(e) => {
                            eprintln!("[completion_handler] Warning: Failed to parse people JSON: {}", e);
                            None
                        }
                    }
                } else {
                    None
                };

                // Parse enrichment data (optional)
                let enrichment = if let Some(ref enrichment_json) = outputs.enrichment_content {
                    match serde_json::from_str::<LeadEnrichment>(enrichment_json) {
                        Ok(e) => Some(e),
                        Err(e) => {
                            eprintln!("[completion_handler] Warning: Failed to parse lead enrichment JSON: {}", e);
                            None
                        }
                    }
                } else {
                    None
                };

                Ok(ParsedOutput::CompanyResearch {
                    profile: outputs.primary_content.clone(),
                    people,
                    enrichment,
                })
            }
            JobType::PersonResearch => {
                // Parse enrichment data (optional)
                let enrichment = if let Some(ref enrichment_json) = outputs.enrichment_content {
                    match serde_json::from_str::<PersonEnrichment>(enrichment_json) {
                        Ok(e) => Some(e),
                        Err(e) => {
                            eprintln!("[completion_handler] Warning: Failed to parse person enrichment JSON: {}", e);
                            None
                        }
                    }
                } else {
                    None
                };

                Ok(ParsedOutput::PersonResearch {
                    profile: outputs.primary_content.clone(),
                    enrichment,
                })
            }
            JobType::Scoring => {
                let score_data: serde_json::Value = serde_json::from_str(&outputs.primary_content)
                    .map_err(|e| CompletionError::ParseError(format!("Invalid score JSON: {}", e)))?;

                // Validate required fields
                if score_data.get("passesRequirements").is_none() {
                    return Err(CompletionError::ValidationError(
                        "Score JSON missing 'passesRequirements' field".to_string()
                    ));
                }

                Ok(ParsedOutput::Scoring { score_data })
            }
            JobType::Conversation => {
                Ok(ParsedOutput::Conversation {
                    topics: outputs.primary_content.clone(),
                })
            }
        }
    }

    /// Update database with parsed output (wrapped in a transaction for atomicity)
    fn update_database(
        &self,
        parsed: &ParsedOutput,
        metadata: &JobMetadata,
    ) -> Result<(), CompletionError> {
        let mut conn = self.db_conn.lock()
            .map_err(|e| CompletionError::DatabaseError(format!("Failed to lock database: {}", e)))?;

        // Start a transaction for atomic updates
        let tx = conn.transaction()
            .map_err(|e| CompletionError::DatabaseError(format!("Failed to start transaction: {}", e)))?;

        let result = self.update_database_in_tx(&tx, parsed, metadata);

        match result {
            Ok(()) => {
                tx.commit()
                    .map_err(|e| CompletionError::DatabaseError(format!("Failed to commit transaction: {}", e)))?;
                Ok(())
            }
            Err(e) => {
                // Transaction will be rolled back on drop
                eprintln!("[completion_handler] Transaction rolled back due to error: {}", e);
                Err(e)
            }
        }
    }

    /// Internal: update database within a transaction
    fn update_database_in_tx(
        &self,
        tx: &rusqlite::Transaction,
        parsed: &ParsedOutput,
        metadata: &JobMetadata,
    ) -> Result<(), CompletionError> {
        let org_id = metadata.clerk_org_id.as_deref();

        match parsed {
            ParsedOutput::CompanyResearch { profile, people, enrichment } => {
                let lead_id = metadata.entity_id;

                // Update people if available (respecting org boundaries)
                if let Some(people_data) = people {
                    // Delete existing people for this lead (respecting org)
                    if let Some(org) = org_id {
                        tx.execute("DELETE FROM people WHERE lead_id = ?1 AND (clerk_org_id IS NULL OR clerk_org_id = ?2)",
                            rusqlite::params![lead_id, org])
                            .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                    } else {
                        tx.execute("DELETE FROM people WHERE lead_id = ?1", rusqlite::params![lead_id])
                            .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                    }

                    // Insert new people with enrichment fields
                    let now = chrono::Utc::now().timestamp();
                    for p in people_data {
                        let first_name = extract_first_name(p);
                        let last_name = extract_last_name(p);
                        let email = p.get("email").and_then(|v| v.as_str());
                        let title = p.get("title").and_then(|v| v.as_str());
                        let linkedin_url = p.get("linkedinUrl").and_then(|v| v.as_str());
                        let management_level = p.get("managementLevel").and_then(|v| v.as_str());
                        let year_joined = p.get("yearJoined").and_then(|v| v.as_i64());

                        if let Some(org) = org_id {
                            tx.execute(
                                "INSERT INTO people (first_name, last_name, email, title, linkedin_url, management_level, year_joined, lead_id, research_status, user_status, created_at, clerk_org_id)
                                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending', 'new', ?9, ?10)",
                                rusqlite::params![first_name, last_name, email, title, linkedin_url, management_level, year_joined, lead_id, now, org],
                            ).map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                        } else {
                            tx.execute(
                                "INSERT INTO people (first_name, last_name, email, title, linkedin_url, management_level, year_joined, lead_id, research_status, user_status, created_at)
                                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending', 'new', ?9)",
                                rusqlite::params![first_name, last_name, email, title, linkedin_url, management_level, year_joined, lead_id, now],
                            ).map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                        }
                    }
                }

                // Update lead with company profile (respecting org boundaries)
                let now = chrono::Utc::now().timestamp();
                if let Some(org) = org_id {
                    tx.execute(
                        "UPDATE leads SET research_status = ?1, company_profile = ?2, researched_at = ?3 WHERE id = ?4 AND (clerk_org_id IS NULL OR clerk_org_id = ?5)",
                        rusqlite::params!["completed", profile, now, lead_id, org],
                    ).map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                } else {
                    tx.execute(
                        "UPDATE leads SET research_status = ?1, company_profile = ?2, researched_at = ?3 WHERE id = ?4",
                        rusqlite::params!["completed", profile, now, lead_id],
                    ).map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                }

                // Apply enrichment data if available (only updates NULL fields, respecting org)
                if let Some(e) = enrichment {
                    db::enrich_lead(tx, lead_id, e, org_id)
                        .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                }
            }
            ParsedOutput::PersonResearch { profile, enrichment } => {
                let person_id = metadata.entity_id;
                let now = chrono::Utc::now().timestamp();
                if let Some(org) = org_id {
                    tx.execute(
                        "UPDATE people SET research_status = ?1, person_profile = ?2, researched_at = ?3 WHERE id = ?4 AND (clerk_org_id IS NULL OR clerk_org_id = ?5)",
                        rusqlite::params!["completed", profile, now, person_id, org],
                    ).map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                } else {
                    tx.execute(
                        "UPDATE people SET research_status = ?1, person_profile = ?2, researched_at = ?3 WHERE id = ?4",
                        rusqlite::params!["completed", profile, now, person_id],
                    ).map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                }

                // Apply enrichment data if available (only updates NULL fields, respecting org)
                if let Some(e) = enrichment {
                    db::enrich_person(tx, person_id, e, org_id)
                        .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                }
            }
            ParsedOutput::Scoring { score_data } => {
                let lead_id = metadata.entity_id;

                // Get active config (respecting org boundaries)
                let (config_query, config_params): (&str, Vec<&dyn rusqlite::ToSql>) = if let Some(org) = org_id {
                    (
                        "SELECT id, name, is_active, required_characteristics, demand_signifiers,
                                tier_hot_min, tier_warm_min, tier_nurture_min, created_at, updated_at
                         FROM scoring_config WHERE is_active = 1 AND (clerk_org_id IS NULL OR clerk_org_id = ?1) ORDER BY id DESC LIMIT 1",
                        vec![org as &dyn rusqlite::ToSql],
                    )
                } else {
                    (
                        "SELECT id, name, is_active, required_characteristics, demand_signifiers,
                                tier_hot_min, tier_warm_min, tier_nurture_min, created_at, updated_at
                         FROM scoring_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1",
                        vec![],
                    )
                };

                let config: db::ParsedScoringConfig = tx.query_row(
                    config_query,
                    config_params.as_slice(),
                    |row| {
                        let required_chars: String = row.get(3)?;
                        let demand_sigs: String = row.get(4)?;
                        Ok(db::ParsedScoringConfig {
                            id: row.get(0)?,
                            name: row.get(1)?,
                            is_active: row.get(2)?,
                            required_characteristics: serde_json::from_str(&required_chars).unwrap_or(serde_json::Value::Array(vec![])),
                            demand_signifiers: serde_json::from_str(&demand_sigs).unwrap_or(serde_json::Value::Array(vec![])),
                            tier_hot_min: row.get(5)?,
                            tier_warm_min: row.get(6)?,
                            tier_nurture_min: row.get(7)?,
                            created_at: row.get(8)?,
                            updated_at: row.get(9)?,
                            clerk_org_id: row.get(10)?,
                        })
                    },
                ).map_err(|e| match e {
                    rusqlite::Error::QueryReturnedNoRows => CompletionError::ValidationError(
                        "No active scoring configuration".to_string()
                    ),
                    _ => CompletionError::DatabaseError(e.to_string()),
                })?;

                let passes_requirements = score_data.get("passesRequirements")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                let requirement_results = score_data.get("requirementResults")
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "[]".to_string());

                let total_score = score_data.get("totalScore")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0);

                let score_breakdown = score_data.get("scoreBreakdown")
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "[]".to_string());

                let tier = score_data.get("tier")
                    .and_then(|v| v.as_str())
                    .unwrap_or("disqualified")
                    .to_string();

                let scoring_notes = score_data.get("scoringNotes")
                    .and_then(|v| v.as_str());

                let now = chrono::Utc::now().timestamp();

                // Delete existing scores for this lead (respecting org boundaries)
                if let Some(org) = org_id {
                    tx.execute("DELETE FROM lead_scores WHERE lead_id = ?1 AND (clerk_org_id IS NULL OR clerk_org_id = ?2)",
                        rusqlite::params![lead_id, org])
                        .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;

                    // Insert new score with org context
                    tx.execute(
                        "INSERT INTO lead_scores (lead_id, config_id, passes_requirements, requirement_results,
                         total_score, score_breakdown, tier, scoring_notes, scored_at, created_at, clerk_org_id)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                        rusqlite::params![lead_id, config.id, passes_requirements, requirement_results,
                                          total_score, score_breakdown, tier, scoring_notes, now, now, org],
                    ).map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                } else {
                    tx.execute("DELETE FROM lead_scores WHERE lead_id = ?1", rusqlite::params![lead_id])
                        .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;

                    // Insert new score without org context
                    tx.execute(
                        "INSERT INTO lead_scores (lead_id, config_id, passes_requirements, requirement_results,
                         total_score, score_breakdown, tier, scoring_notes, scored_at, created_at)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                        rusqlite::params![lead_id, config.id, passes_requirements, requirement_results,
                                          total_score, score_breakdown, tier, scoring_notes, now, now],
                    ).map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                }
            }
            ParsedOutput::Conversation { topics } => {
                let person_id = metadata.entity_id;
                let now = chrono::Utc::now().timestamp();
                if let Some(org) = org_id {
                    tx.execute(
                        "UPDATE people SET conversation_topics = ?1, conversation_generated_at = ?2 WHERE id = ?3 AND (clerk_org_id IS NULL OR clerk_org_id = ?4)",
                        rusqlite::params![topics, now, person_id, org],
                    ).map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                } else {
                    tx.execute(
                        "UPDATE people SET conversation_topics = ?1, conversation_generated_at = ?2 WHERE id = ?3",
                        rusqlite::params![topics, now, person_id],
                    ).map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                }
            }
        }

        Ok(())
    }

    /// Cleanup output files after database is confirmed updated
    fn cleanup_files(&self, metadata: &JobMetadata) -> Result<(), CompletionError> {
        let primary_path = &metadata.primary_output_path;

        // For research jobs, delete the entire directory
        if matches!(metadata.job_type, JobType::CompanyResearch | JobType::PersonResearch) {
            if let Some(parent) = primary_path.parent() {
                if parent.exists() {
                    if let Err(e) = fs::remove_dir_all(parent) {
                        eprintln!("[completion_handler] Warning: Failed to cleanup directory {:?}: {}", parent, e);
                    }
                }
            }
        } else {
            // For other jobs, just delete the output file
            if primary_path.exists() {
                if let Err(e) = fs::remove_file(primary_path) {
                    eprintln!("[completion_handler] Warning: Failed to cleanup file {:?}: {}", primary_path, e);
                }
            }
        }

        Ok(())
    }

    /// Emit completion events for frontend cache invalidation
    fn emit_completion_events(&self, metadata: &JobMetadata) {
        let clerk_org_id = metadata.clerk_org_id.clone();
        match metadata.job_type {
            JobType::CompanyResearch => {
                events::emit_lead_updated(&self.app_handle, metadata.entity_id, clerk_org_id.clone());
                events::emit_people_bulk_created(&self.app_handle, metadata.entity_id, clerk_org_id);
            }
            JobType::PersonResearch => {
                // Get lead_id for the person
                if let Ok(conn) = self.db_conn.lock() {
                    if let Ok(Some(person)) = db::get_person_raw(&conn, metadata.entity_id, metadata.clerk_org_id.as_deref()) {
                        events::emit_person_updated(&self.app_handle, metadata.entity_id, person.lead_id, clerk_org_id);
                    }
                }
            }
            JobType::Scoring => {
                events::emit_lead_scored(&self.app_handle, metadata.entity_id, clerk_org_id);
            }
            JobType::Conversation => {
                if let Ok(conn) = self.db_conn.lock() {
                    if let Ok(Some(person)) = db::get_person_raw(&conn, metadata.entity_id, metadata.clerk_org_id.as_deref()) {
                        events::emit_person_updated(&self.app_handle, metadata.entity_id, person.lead_id, clerk_org_id);
                    }
                }
            }
        }
    }

    /// Mark entity as failed when job fails (respecting org boundaries)
    pub fn mark_entity_failed(&self, metadata: &JobMetadata) {
        if let Ok(conn) = self.db_conn.lock() {
            let org_id = metadata.clerk_org_id.as_deref();
            match metadata.job_type {
                JobType::CompanyResearch => {
                    if let Some(org) = org_id {
                        let _ = conn.execute(
                            "UPDATE leads SET research_status = 'failed' WHERE id = ?1 AND (clerk_org_id IS NULL OR clerk_org_id = ?2)",
                            rusqlite::params![metadata.entity_id, org],
                        );
                    } else {
                        let _ = conn.execute(
                            "UPDATE leads SET research_status = 'failed' WHERE id = ?1",
                            rusqlite::params![metadata.entity_id],
                        );
                    }
                }
                JobType::PersonResearch => {
                    if let Some(org) = org_id {
                        let _ = conn.execute(
                            "UPDATE people SET research_status = 'failed' WHERE id = ?1 AND (clerk_org_id IS NULL OR clerk_org_id = ?2)",
                            rusqlite::params![metadata.entity_id, org],
                        );
                    } else {
                        let _ = conn.execute(
                            "UPDATE people SET research_status = 'failed' WHERE id = ?1",
                            rusqlite::params![metadata.entity_id],
                        );
                    }
                }
                JobType::Scoring | JobType::Conversation => {
                    // No status field to update for these types
                }
            }
        }
    }

    /// Update completion state in database for recovery
    fn update_completion_state(&self, job_id: &str, phase: CompletionPhase) {
        let state_str = serde_json::to_string(&phase).ok();
        if let Ok(conn) = self.db_conn.lock() {
            let _ = db::update_job_completion_state(&conn, job_id, state_str.as_deref());
        }
    }
}

/// Helper to extract first name from people JSON
fn extract_first_name(p: &serde_json::Value) -> String {
    if let Some(fn_val) = p.get("firstName").and_then(|v| v.as_str()) {
        fn_val.to_string()
    } else if let Some(name) = p.get("name").and_then(|v| v.as_str()) {
        let parts: Vec<&str> = name.split_whitespace().collect();
        parts.first().unwrap_or(&"Unknown").to_string()
    } else {
        "Unknown".to_string()
    }
}

/// Helper to extract last name from people JSON
fn extract_last_name(p: &serde_json::Value) -> String {
    if let Some(ln_val) = p.get("lastName").and_then(|v| v.as_str()) {
        ln_val.to_string()
    } else if let Some(name) = p.get("name").and_then(|v| v.as_str()) {
        let parts: Vec<&str> = name.split_whitespace().collect();
        parts.get(1..).unwrap_or(&[]).join(" ")
    } else {
        String::new()
    }
}
