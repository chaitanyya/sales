use std::fs;
use std::path::PathBuf;
use tauri::{ipc::Channel, State, AppHandle, Manager};
use crate::db::{self, DbState};
use crate::events::{emit_lead_updated, emit_person_updated};
use crate::jobs::{JobQueue, StreamEvent, JobMetadata, JobType, EntityContext, EntityType};
use crate::prompts::get_default_prompt;

// ============================================================================
// Research Commands
// ============================================================================

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchResult {
    pub job_id: String,
    pub status: String,
}

#[tauri::command]
pub async fn start_research(
    app: AppHandle,
    state: State<'_, DbState>,
    queue: State<'_, JobQueue>,
    lead_id: i64,
    custom_prompt: Option<String>,
    on_event: Channel<StreamEvent>,
) -> Result<ResearchResult, String> {
    // Check for existing active job and cancel it if found
    let existing_job_id = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        db::get_active_job_for_entity(&conn, lead_id, "company_research")
            .map_err(|e| e.to_string())?
            .map(|job| job.id)
    };
    if let Some(job_id) = existing_job_id {
        eprintln!("[research] Cancelling existing job {} for lead {}", job_id, lead_id);
        let _ = queue.kill_job(&job_id).await;
    }

    // Get lead
    let lead = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        db::get_lead(&conn, lead_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Lead not found".to_string())?
    };

    // Update status to in_progress
    {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE leads SET research_status = 'in_progress' WHERE id = ?1",
            rusqlite::params![lead_id],
        ).map_err(|e| e.to_string())?;
    }

    // Emit event so frontend updates immediately
    emit_lead_updated(&app, lead_id);

    // Get prompts (with fallback to defaults)
    let (company_prompt_content, company_overview) = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let cp = db::get_prompt_by_type(&conn, "company").map_err(|e| e.to_string())?;
        let co = db::get_prompt_by_type(&conn, "company_overview").map_err(|e| e.to_string())?;

        // Use DB prompt or fall back to default
        let content = cp.map(|p| p.content)
            .or_else(|| get_default_prompt("company").map(String::from));
        (content, co)
    };

    let prompt_content = custom_prompt
        .or(company_prompt_content)
        .ok_or_else(|| "No company prompt configured".to_string())?;

    // Set up output directory
    let data_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    let output_dir = data_dir.join("research");
    fs::create_dir_all(&output_dir).ok();

    let company_slug = lead.company_name
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect::<String>();
    let lead_dir = output_dir.join(format!("company_{}_{}", lead_id, company_slug));
    fs::create_dir_all(&lead_dir).ok();

    let profile_path = lead_dir.join("company_profile.md");
    let people_path = lead_dir.join("people.json");

    // Build prompt with file paths
    let full_prompt = build_research_prompt(
        &prompt_content,
        &lead,
        &profile_path,
        &people_path,
        company_overview.as_ref().map(|p| p.content.as_str()),
    );

    // Send initial event (job_id is "pending" as actual job hasn't been created yet)
    let _ = on_event.send(StreamEvent {
        job_id: "pending".to_string(),
        event_type: "info".to_string(),
        content: format!("Starting research for {}...", lead.company_name),
        timestamp: chrono::Utc::now().timestamp_millis(),
    });

    // Start job with callback
    let working_dir = std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| ".".to_string());

    let metadata = JobMetadata {
        job_type: JobType::CompanyResearch,
        entity_id: lead_id,
        primary_output_path: profile_path,
        secondary_output_path: Some(people_path),
    };

    // Clone the app handle for the callback
    let entity_label = lead.company_name.clone();

    // Create entity context for status rollback on early failure
    let entity_context = EntityContext {
        entity_type: EntityType::Lead,
        entity_id: lead_id,
        rollback_status: "pending".to_string(),
    };

    // Note: CompletionHandler in queue.rs handles all database updates and file cleanup
    // The callback is now just for any additional custom logic
    let job_id = queue.start_job_with_callback(
        app.app_handle().clone(),
        full_prompt,
        working_dir,
        on_event.clone(),
        metadata,
        entity_label,
        Some(entity_context),
        move |_meta, _output, _success| {
            // CompletionHandler handles all completion logic
        },
    ).await?;

    Ok(ResearchResult {
        job_id,
        status: "started".to_string(),
    })
}

#[tauri::command]
pub async fn start_person_research(
    app: AppHandle,
    state: State<'_, DbState>,
    queue: State<'_, JobQueue>,
    person_id: i64,
    custom_prompt: Option<String>,
    on_event: Channel<StreamEvent>,
) -> Result<ResearchResult, String> {
    // Check for existing active job and cancel it if found
    let existing_job_id = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        db::get_active_job_for_entity(&conn, person_id, "person_research")
            .map_err(|e| e.to_string())?
            .map(|job| job.id)
    };
    if let Some(job_id) = existing_job_id {
        eprintln!("[research] Cancelling existing job {} for person {}", job_id, person_id);
        let _ = queue.kill_job(&job_id).await;
    }

    // Get person and lead
    let (person, lead) = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let p = db::get_person_raw(&conn, person_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Person not found".to_string())?;
        let l = db::get_lead(&conn, p.lead_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Lead not found".to_string())?;
        (p, l)
    };

    // Update status to in_progress
    {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE people SET research_status = 'in_progress' WHERE id = ?1",
            rusqlite::params![person_id],
        ).map_err(|e| e.to_string())?;
    }

    // Emit event so frontend updates immediately
    emit_person_updated(&app, person_id, person.lead_id);

    // Get prompts (with fallback to defaults)
    let (person_prompt_content, company_overview) = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let pp = db::get_prompt_by_type(&conn, "person").map_err(|e| e.to_string())?;
        let co = db::get_prompt_by_type(&conn, "company_overview").map_err(|e| e.to_string())?;

        // Use DB prompt or fall back to default
        let content = pp.map(|p| p.content)
            .or_else(|| get_default_prompt("person").map(String::from));
        (content, co)
    };

    let prompt_content = custom_prompt
        .or(person_prompt_content)
        .ok_or_else(|| "No person prompt configured".to_string())?;

    // Set up output directory
    let data_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    let output_dir = data_dir.join("research");
    fs::create_dir_all(&output_dir).ok();

    let person_slug = format!("{}_{}", person.first_name, person.last_name)
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect::<String>();
    let person_dir = output_dir.join(format!("person_{}_{}", person_id, person_slug));
    fs::create_dir_all(&person_dir).ok();

    let profile_path = person_dir.join("person_profile.md");

    // Build prompt with file path
    let full_prompt = build_person_research_prompt(
        &prompt_content,
        &person,
        &lead,
        &profile_path,
        company_overview.as_ref().map(|p| p.content.as_str()),
    );

    let full_name = format!("{} {}", person.first_name, person.last_name);

    // Send initial event (job_id is "pending" as actual job hasn't been created yet)
    let _ = on_event.send(StreamEvent {
        job_id: "pending".to_string(),
        event_type: "info".to_string(),
        content: format!("Starting research for {}...", full_name),
        timestamp: chrono::Utc::now().timestamp_millis(),
    });

    // Start job with callback
    let working_dir = std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| ".".to_string());

    let metadata = JobMetadata {
        job_type: JobType::PersonResearch,
        entity_id: person_id,
        primary_output_path: profile_path,
        secondary_output_path: None,
    };

    let entity_label = full_name.clone();

    // Create entity context for status rollback on early failure
    let entity_context = EntityContext {
        entity_type: EntityType::Person,
        entity_id: person_id,
        rollback_status: "pending".to_string(),
    };

    // Note: CompletionHandler in queue.rs handles all database updates and file cleanup
    let job_id = queue.start_job_with_callback(
        app.app_handle().clone(),
        full_prompt,
        working_dir,
        on_event.clone(),
        metadata,
        entity_label,
        Some(entity_context),
        move |_meta, _output, _success| {
            // CompletionHandler handles all completion logic
        },
    ).await?;

    Ok(ResearchResult {
        job_id,
        status: "started".to_string(),
    })
}

#[tauri::command]
pub async fn kill_job(
    queue: State<'_, JobQueue>,
    job_id: String,
) -> Result<(), String> {
    queue.kill_job(&job_id).await
}

#[tauri::command]
pub async fn get_active_jobs(
    queue: State<'_, JobQueue>,
) -> Result<Vec<String>, String> {
    Ok(queue.get_active_jobs().await)
}

// ============================================================================
// Prompt Builders
// ============================================================================

fn build_research_prompt(
    prompt: &str,
    lead: &db::Lead,
    profile_path: &std::path::Path,
    people_path: &std::path::Path,
    company_overview: Option<&str>,
) -> String {
    let mut full_prompt = String::new();

    // Add company overview context if available
    if let Some(overview) = company_overview {
        full_prompt.push_str("# Company Overview\n\n");
        full_prompt.push_str(overview);
        full_prompt.push_str("\n\n---\n\n");
    }

    full_prompt.push_str(prompt);
    full_prompt.push_str("\n\n# Company Information\n\n");
    full_prompt.push_str(&format!("Company Name: {}\n", lead.company_name));

    if let Some(website) = &lead.website {
        full_prompt.push_str(&format!("Website: {}\n", website));
    }
    if let Some(industry) = &lead.industry {
        full_prompt.push_str(&format!("Industry: {}\n", industry));
    }
    if let Some(city) = &lead.city {
        full_prompt.push_str(&format!("City: {}\n", city));
    }
    if let Some(state) = &lead.state {
        full_prompt.push_str(&format!("State: {}\n", state));
    }
    if let Some(country) = &lead.country {
        full_prompt.push_str(&format!("Country: {}\n", country));
    }
    if let Some(employees) = &lead.employee_range {
        full_prompt.push_str(&format!("Employees: {}\n", employees));
    }

    full_prompt.push_str("\n# Output Files\n\n");
    full_prompt.push_str(&format!(
        "Write the company profile to: {}\n",
        profile_path.display()
    ));
    full_prompt.push_str(&format!(
        "Write the people JSON to: {}\n",
        people_path.display()
    ));
    full_prompt.push_str("\nThe people JSON should be an array of objects with these fields:\n");
    full_prompt.push_str("- firstName (string)\n");
    full_prompt.push_str("- lastName (string)\n");
    full_prompt.push_str("- email (string, optional)\n");
    full_prompt.push_str("- title (string)\n");
    full_prompt.push_str("- linkedinUrl (string, optional)\n");

    full_prompt
}

fn build_person_research_prompt(
    prompt: &str,
    person: &db::Person,
    lead: &db::Lead,
    profile_path: &std::path::Path,
    company_overview: Option<&str>,
) -> String {
    let mut full_prompt = String::new();

    // Add company overview context if available
    if let Some(overview) = company_overview {
        full_prompt.push_str("# Company Overview\n\n");
        full_prompt.push_str(overview);
        full_prompt.push_str("\n\n---\n\n");
    }

    full_prompt.push_str(prompt);
    full_prompt.push_str("\n\n# Person Information\n\n");
    full_prompt.push_str(&format!("Name: {} {}\n", person.first_name, person.last_name));

    if let Some(title) = &person.title {
        full_prompt.push_str(&format!("Title: {}\n", title));
    }
    if let Some(email) = &person.email {
        full_prompt.push_str(&format!("Email: {}\n", email));
    }
    if let Some(linkedin) = &person.linkedin_url {
        full_prompt.push_str(&format!("LinkedIn: {}\n", linkedin));
    }

    full_prompt.push_str("\n# Company Information\n\n");
    full_prompt.push_str(&format!("Company: {}\n", lead.company_name));
    if let Some(website) = &lead.website {
        full_prompt.push_str(&format!("Website: {}\n", website));
    }

    full_prompt.push_str("\n# Output File\n\n");
    full_prompt.push_str(&format!(
        "Write the person profile to: {}\n",
        profile_path.display()
    ));

    full_prompt
}

// ============================================================================
// Scoring Commands
// ============================================================================

#[tauri::command]
pub async fn start_scoring(
    app: AppHandle,
    state: State<'_, DbState>,
    queue: State<'_, JobQueue>,
    lead_id: i64,
    on_event: Channel<StreamEvent>,
) -> Result<ResearchResult, String> {
    // Check for existing active job and cancel it if found
    let existing_job_id = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        db::get_active_job_for_entity(&conn, lead_id, "scoring")
            .map_err(|e| e.to_string())?
            .map(|job| job.id)
    };
    if let Some(job_id) = existing_job_id {
        eprintln!("[research] Cancelling existing scoring job {} for lead {}", job_id, lead_id);
        let _ = queue.kill_job(&job_id).await;
    }

    // Get lead with people
    let (lead, people) = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let l = db::get_lead(&conn, lead_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Lead not found".to_string())?;
        let p = db::get_people_for_lead(&conn, lead_id)
            .map_err(|e| e.to_string())?;
        (l, p)
    };

    // Get active scoring config
    let config = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        db::get_active_scoring_config(&conn)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "No active scoring configuration found".to_string())?
    };

    // Set up output directory
    let data_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    let output_dir = data_dir.join("scoring");
    fs::create_dir_all(&output_dir).ok();

    let company_slug = lead.company_name
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect::<String>();
    let score_path = output_dir.join(format!("score_{}_{}.json", lead_id, company_slug));

    // Build scoring prompt
    let full_prompt = build_scoring_prompt(&lead, &people, &config, &score_path);

    // Send initial event (job_id is "pending" as actual job hasn't been created yet)
    let _ = on_event.send(StreamEvent {
        job_id: "pending".to_string(),
        event_type: "info".to_string(),
        content: format!("Starting scoring for {}...", lead.company_name),
        timestamp: chrono::Utc::now().timestamp_millis(),
    });

    // Start job with callback
    let working_dir = std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| ".".to_string());

    let metadata = JobMetadata {
        job_type: JobType::Scoring,
        entity_id: lead_id,
        primary_output_path: score_path,
        secondary_output_path: None,
    };

    let entity_label = format!("{} (Scoring)", lead.company_name);

    // Note: Scoring jobs don't have a research_status to reset, so no entity context needed
    // Note: CompletionHandler in queue.rs handles all database updates and file cleanup
    let job_id = queue.start_job_with_callback(
        app.app_handle().clone(),
        full_prompt,
        working_dir,
        on_event.clone(),
        metadata,
        entity_label,
        None, // No entity status to rollback for scoring
        move |_meta, _output, _success| {
            // CompletionHandler handles all completion logic
        },
    ).await?;

    Ok(ResearchResult {
        job_id,
        status: "started".to_string(),
    })
}

// ============================================================================
// Conversation Generation Commands
// ============================================================================

#[tauri::command]
pub async fn start_conversation_generation(
    app: AppHandle,
    state: State<'_, DbState>,
    queue: State<'_, JobQueue>,
    person_id: i64,
    on_event: Channel<StreamEvent>,
) -> Result<ResearchResult, String> {
    // Check for existing active job and cancel it if found
    let existing_job_id = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        db::get_active_job_for_entity(&conn, person_id, "conversation")
            .map_err(|e| e.to_string())?
            .map(|job| job.id)
    };
    if let Some(job_id) = existing_job_id {
        eprintln!("[research] Cancelling existing conversation job {} for person {}", job_id, person_id);
        let _ = queue.kill_job(&job_id).await;
    }

    // Get person and lead
    let (person, lead) = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let p = db::get_person_raw(&conn, person_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Person not found".to_string())?;
        let l = db::get_lead(&conn, p.lead_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Lead not found".to_string())?;
        (p, l)
    };

    // Get prompts (with fallback to defaults)
    let (conversation_prompt_content, company_overview) = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        let cp = db::get_prompt_by_type(&conn, "conversation_topics").map_err(|e| e.to_string())?;
        let co = db::get_prompt_by_type(&conn, "company_overview").map_err(|e| e.to_string())?;

        // Use DB prompt or fall back to default
        let content = cp.map(|p| p.content)
            .or_else(|| get_default_prompt("conversation_topics").map(String::from));
        (content, co)
    };

    let prompt_content = conversation_prompt_content
        .ok_or_else(|| "No conversation topics prompt configured".to_string())?;

    // Set up output directory
    let data_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    let output_dir = data_dir.join("conversations");
    fs::create_dir_all(&output_dir).ok();

    let person_slug = format!("{}_{}", person.first_name, person.last_name)
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect::<String>();
    let conversation_path = output_dir.join(format!("conversation_{}_{}.md", person_id, person_slug));

    // Build conversation prompt
    let full_prompt = build_conversation_prompt(
        &prompt_content,
        &person,
        &lead,
        &conversation_path,
        company_overview.as_ref().map(|p| p.content.as_str()),
    );

    let full_name = format!("{} {}", person.first_name, person.last_name);

    // Send initial event (job_id is "pending" as actual job hasn't been created yet)
    let _ = on_event.send(StreamEvent {
        job_id: "pending".to_string(),
        event_type: "info".to_string(),
        content: format!("Generating conversation topics for {}...", full_name),
        timestamp: chrono::Utc::now().timestamp_millis(),
    });

    // Start job with callback
    let working_dir = std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| ".".to_string());

    let metadata = JobMetadata {
        job_type: JobType::Conversation,
        entity_id: person_id,
        primary_output_path: conversation_path,
        secondary_output_path: None,
    };

    let entity_label = format!("{} (Conversation)", full_name);

    // Note: Conversation jobs don't have a research_status to reset, so no entity context needed
    // Note: CompletionHandler in queue.rs handles all database updates and file cleanup
    let job_id = queue.start_job_with_callback(
        app.app_handle().clone(),
        full_prompt,
        working_dir,
        on_event.clone(),
        metadata,
        entity_label,
        None, // No entity status to rollback for conversation
        move |_meta, _output, _success| {
            // CompletionHandler handles all completion logic
        },
    ).await?;

    Ok(ResearchResult {
        job_id,
        status: "started".to_string(),
    })
}

// ============================================================================
// Scoring Prompt Builder
// ============================================================================

fn build_scoring_prompt(
    lead: &db::Lead,
    people: &[db::Person],
    config: &db::ParsedScoringConfig,
    output_path: &std::path::Path,
) -> String {
    // Parse required characteristics and demand signifiers from JSON
    let required_chars: Vec<serde_json::Value> = config.required_characteristics
        .as_array()
        .cloned()
        .unwrap_or_default();
    let demand_sigs: Vec<serde_json::Value> = config.demand_signifiers
        .as_array()
        .cloned()
        .unwrap_or_default();

    // Filter enabled items
    let enabled_reqs: Vec<_> = required_chars.iter()
        .filter(|c| c.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false))
        .collect();
    let enabled_sigs: Vec<_> = demand_sigs.iter()
        .filter(|s| s.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false))
        .collect();

    // Calculate total weight
    let total_weight: f64 = enabled_sigs.iter()
        .map(|s| s.get("weight").and_then(|v| v.as_f64()).unwrap_or(0.0))
        .sum();

    // Format lead context
    let lead_context = format_lead_context(lead, people);

    // Format required characteristics
    let req_formatted = if enabled_reqs.is_empty() {
        "No required characteristics defined.".to_string()
    } else {
        enabled_reqs.iter().enumerate().map(|(i, c)| {
            let name = c.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown");
            let desc = c.get("description").and_then(|v| v.as_str()).unwrap_or("");
            format!("{}. {}\n   - {}", i + 1, name, desc)
        }).collect::<Vec<_>>().join("\n")
    };

    // Format demand signifiers
    let sig_formatted = if enabled_sigs.is_empty() {
        "No demand signifiers defined.".to_string()
    } else {
        enabled_sigs.iter().enumerate().map(|(i, s)| {
            let name = s.get("name").and_then(|v| v.as_str()).unwrap_or("Unknown");
            let desc = s.get("description").and_then(|v| v.as_str()).unwrap_or("");
            let weight = s.get("weight").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let percentage = if total_weight > 0.0 {
                ((weight / total_weight) * 100.0).round() as i32
            } else {
                0
            };
            format!("{}. {} (Weight: {}/10, {}% of total score)\n   - {}",
                i + 1, name, weight as i32, percentage, desc)
        }).collect::<Vec<_>>().join("\n")
    };

    // Get IDs for JSON example
    let req_ids: Vec<String> = enabled_reqs.iter()
        .filter_map(|c| c.get("id").and_then(|v| v.as_str()).map(String::from))
        .collect();
    let sig_ids: Vec<String> = enabled_sigs.iter()
        .filter_map(|s| s.get("id").and_then(|v| v.as_str()).map(String::from))
        .collect();

    // Example values for JSON
    let example_req = enabled_reqs.first();
    let example_sig = enabled_sigs.first();

    let example_req_id = example_req
        .and_then(|r| r.get("id").and_then(|v| v.as_str()))
        .unwrap_or("req-id");
    let example_req_name = example_req
        .and_then(|r| r.get("name").and_then(|v| v.as_str()))
        .unwrap_or("Requirement Name");

    let example_sig_id = example_sig
        .and_then(|s| s.get("id").and_then(|v| v.as_str()))
        .unwrap_or("sig-id");
    let example_sig_name = example_sig
        .and_then(|s| s.get("name").and_then(|v| v.as_str()))
        .unwrap_or("Signifier Name");
    let example_sig_weight = example_sig
        .and_then(|s| s.get("weight").and_then(|v| v.as_i64()))
        .unwrap_or(5);

    let example_weighted_score = if total_weight > 0.0 {
        ((80.0 * example_sig_weight as f64) / total_weight).round() as i32
    } else {
        0
    };

    format!(r#"You are a lead scoring analyst. Your task is to evaluate the following company as a sales lead and provide a detailed scoring assessment.

COMPANY INFORMATION:
{lead_context}

SCORING CRITERIA:

## Required Characteristics (Pass/Fail)
These are gates that must be passed for a lead to be considered qualified. If ANY required characteristic fails, the lead will be classified as "disqualified" regardless of the demand signifier scores.

{req_formatted}

## Demand Signifiers (Weighted Scoring)
Evaluate each of the following factors on a scale of 0-100. The final score is calculated as a weighted average.

{sig_formatted}

## Tier Thresholds
- Hot: {}+ (highest priority leads)
- Warm: {}-{} (good potential)
- Nurture: {}-{} (needs development)
- Disqualified: Below {} OR fails any required characteristic

INSTRUCTIONS:

1. First, evaluate each Required Characteristic:
   - Research the company if needed using web search
   - Determine if each requirement is PASSED or FAILED
   - Provide a brief reason for each decision

2. If all requirements pass, score each Demand Signifier:
   - Research thoroughly to find evidence for each factor
   - Assign a score from 0-100 based on the evidence
   - Provide reasoning for each score

3. Calculate the total weighted score using this formula:
   Total Score = Sum of (signifier_score * weight) / total_weight

4. Determine the tier based on:
   - If any requirement fails: tier = "disqualified"
   - Otherwise: based on total score and tier thresholds

5. Write your complete assessment to the output file.

OUTPUT FORMAT:
Write a JSON file to: {}

The JSON must have this exact structure:
{{
  "passesRequirements": true/false,
  "requirementResults": [
    {{
      "id": "{}",
      "name": "{}",
      "passed": true/false,
      "reason": "Explanation of why this passed or failed"
    }}
  ],
  "totalScore": 75,
  "scoreBreakdown": [
    {{
      "id": "{}",
      "name": "{}",
      "weight": {},
      "score": 80,
      "weightedScore": {},
      "reason": "Explanation of the score"
    }}
  ],
  "tier": "hot" | "warm" | "nurture" | "disqualified",
  "scoringNotes": "Overall summary and key observations about this lead"
}}

IMPORTANT NOTES:
- Be thorough in your research - use web search if company profile doesn't have enough information
- Be objective and evidence-based in your scoring
- The requirementResults array must include an entry for each enabled requirement: {}
- The scoreBreakdown array must include an entry for each enabled signifier: {}
- Calculate weightedScore as: (score * weight) / {}
- If requirements fail, still include scoreBreakdown but totalScore should reflect the disqualified status
- Write ONLY valid JSON to the output file, no additional text

Begin your analysis now."#,
        config.tier_hot_min,
        config.tier_warm_min, config.tier_hot_min - 1,
        config.tier_nurture_min, config.tier_warm_min - 1,
        config.tier_nurture_min,
        output_path.display(),
        example_req_id, example_req_name,
        example_sig_id, example_sig_name, example_sig_weight, example_weighted_score,
        req_ids.join(", "),
        sig_ids.join(", "),
        total_weight as i32
    )
}

// ============================================================================
// Conversation Prompt Builder
// ============================================================================

fn build_conversation_prompt(
    conversation_prompt: &str,
    person: &db::Person,
    lead: &db::Lead,
    output_path: &std::path::Path,
    company_overview: Option<&str>,
) -> String {
    // Format what we do section
    let what_we_do = if let Some(overview) = company_overview {
        format!("<WhatWeDo>\n{}\n</WhatWeDo>\n\n", overview)
    } else {
        String::new()
    };

    // Format person context
    let person_context = format!(
        "Name: {} {}\nTitle: {}\nEmail: {}\nLinkedIn: {}\nManagement Level: {}\nYear Joined: {}",
        person.first_name,
        person.last_name,
        person.title.as_deref().unwrap_or("N/A"),
        person.email.as_deref().unwrap_or("N/A"),
        person.linkedin_url.as_deref().unwrap_or("N/A"),
        person.management_level.as_deref().unwrap_or("N/A"),
        person.year_joined.map(|y| y.to_string()).unwrap_or_else(|| "N/A".to_string())
    );

    // Format lead context
    let lead_context = format!(
        "Company Name: {}\nWebsite: {}\nIndustry: {}\nSub-Industry: {}\nEmployees: {}\nEmployee Range: {}\nRevenue: {}\nRevenue Range: {}\nLinkedIn: {}\nCity: {}\nState: {}\nCountry: {}",
        lead.company_name,
        lead.website.as_deref().unwrap_or("N/A"),
        lead.industry.as_deref().unwrap_or("N/A"),
        lead.sub_industry.as_deref().unwrap_or("N/A"),
        lead.employees.map(|e| e.to_string()).unwrap_or_else(|| "N/A".to_string()),
        lead.employee_range.as_deref().unwrap_or("N/A"),
        lead.revenue.map(|r| r.to_string()).unwrap_or_else(|| "N/A".to_string()),
        lead.revenue_range.as_deref().unwrap_or("N/A"),
        lead.company_linkedin_url.as_deref().unwrap_or("N/A"),
        lead.city.as_deref().unwrap_or("N/A"),
        lead.state.as_deref().unwrap_or("N/A"),
        lead.country.as_deref().unwrap_or("N/A")
    );

    // Add person profile if available
    let person_profile = if let Some(profile) = &person.person_profile {
        format!("\n\nPerson Research Profile:\n{}", profile)
    } else {
        String::new()
    };

    // Add company profile if available
    let company_profile = if let Some(profile) = &lead.company_profile {
        format!("\n\nCompany Research Profile:\n{}", profile)
    } else {
        String::new()
    };

    format!(
        r#"{}<TargetPerson>
{}{}
</TargetPerson>

<TargetCompany>
{}{}
</TargetCompany>

<ConversationInstructions>
{}
</ConversationInstructions>

<OutputRequirements>
Save conversation topics to: {}
Format: Markdown document with talking points and engagement strategies.
</OutputRequirements>
"#,
        what_we_do,
        person_context,
        person_profile,
        lead_context,
        company_profile,
        conversation_prompt,
        output_path.display()
    )
}

// ============================================================================
// Lead Context Formatter
// ============================================================================

fn format_lead_context(lead: &db::Lead, people: &[db::Person]) -> String {
    let mut parts = vec![
        format!("Company Name: {}", lead.company_name),
        format!("Website: {}", lead.website.as_deref().unwrap_or("N/A")),
        format!("Industry: {}", lead.industry.as_deref().unwrap_or("N/A")),
        format!("Sub-Industry: {}", lead.sub_industry.as_deref().unwrap_or("N/A")),
        format!("Employees: {}", lead.employees.map(|e| e.to_string()).unwrap_or_else(|| "N/A".to_string())),
        format!("Employee Range: {}", lead.employee_range.as_deref().unwrap_or("N/A")),
        format!("Revenue: {}", lead.revenue.map(|r| r.to_string()).unwrap_or_else(|| "N/A".to_string())),
        format!("Revenue Range: {}", lead.revenue_range.as_deref().unwrap_or("N/A")),
        format!("LinkedIn: {}", lead.company_linkedin_url.as_deref().unwrap_or("N/A")),
        format!("City: {}", lead.city.as_deref().unwrap_or("N/A")),
        format!("State: {}", lead.state.as_deref().unwrap_or("N/A")),
        format!("Country: {}", lead.country.as_deref().unwrap_or("N/A")),
    ];

    // Add company profile if available
    if let Some(profile) = &lead.company_profile {
        parts.push(format!("\nCompany Research Profile:\n{}", profile));
    }

    // Add people
    if !people.is_empty() {
        parts.push(format!("\nKey People ({}):", people.len()));
        for person in people {
            let name = format!("{} {}", person.first_name, person.last_name);
            let title = person.title.as_deref().unwrap_or("Unknown title");
            let email = person.email.as_deref().unwrap_or("No email");
            let linkedin = person.linkedin_url.as_deref().unwrap_or("No LinkedIn");
            parts.push(format!("  - {}, {} ({}, {})", name, title, email, linkedin));
            if let Some(profile) = &person.person_profile {
                let truncated = if profile.len() > 200 {
                    format!("{}...", &profile[..200])
                } else {
                    profile.clone()
                };
                parts.push(format!("    Profile: {}", truncated));
            }
        }
    }

    parts.join("\n")
}
