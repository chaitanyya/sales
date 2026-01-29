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

// ============================================================================
// Research Commands
// ============================================================================

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResearchResult {
    pub job_id: String,
    pub status: String,
}

/// Extract JSON object from stdout output.
/// This handles cases where the AI outputs JSON directly to stdout
/// instead of writing to files.
fn extract_json_from_stdout(output: &str) -> Option<serde_json::Value> {
    // Try to parse the entire output as JSON first
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(output) {
        if json.is_object() {
            return Some(json);
        }
    }

    // Look for JSON object boundaries in the output
    // Find the first '{' and matching last '}'
    let start = output.find('{')?;
    let mut brace_count = 0usize;
    let mut end = None;

    for (i, c) in output[start..].char_indices() {
        match c {
            '{' => brace_count += 1,
            '}' => {
                brace_count -= 1;
                if brace_count == 0 {
                    end = Some(start + i + 1);
                    break;
                }
            }
            _ => {}
        }
    }

    if let Some(end_idx) = end {
        let json_str = &output[start..end_idx];
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(json_str) {
            return Some(json);
        }
    }

    // Look for a markdown code block with JSON
    if let Some(code_start) = output.find("```json") {
        let after_code = &output[code_start + 7..];
        if let Some(code_end) = after_code.find("```") {
            let json_str = after_code[..code_end].trim();
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(json_str) {
                return Some(json);
            }
        }
    }

    // Try looking for any code block
    if let Some(code_start) = output.find("```") {
        let after_code = &output[code_start + 3..];
        if let Some(newline) = after_code.find('\n') {
            let after_newline = &after_code[newline + 1..];
            if let Some(code_end) = after_newline.find("```") {
                let json_str = after_newline[..code_end].trim();
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(json_str) {
                    return Some(json);
                }
            }
        }
    }

    None
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
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
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
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        db::get_lead(&conn, lead_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Lead not found".to_string())?
    };

    // Update status to in_progress
    {
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        conn.execute(
            "UPDATE leads SET research_status = 'in_progress' WHERE id = ?1",
            rusqlite::params![lead_id],
        ).map_err(|e| e.to_string())?;
    }

    // Emit event so frontend updates immediately
    emit_lead_updated(&app, lead_id);

    // Get prompts (with fallback to defaults) and company profile context
    let (company_prompt_content, company_overview, company_profile_context) = {
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        let cp = db::get_prompt_by_type(&conn, "company").map_err(|e| e.to_string())?;
        let co = db::get_prompt_by_type(&conn, "company_overview").map_err(|e| e.to_string())?;
        let profile_ctx = get_company_profile_context(&conn);

        // Use DB prompt or fall back to default
        let content = cp.map(|p| p.content)
            .or_else(|| get_default_prompt("company").map(String::from));
        (content, co, profile_ctx)
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
    let enrichment_path = lead_dir.join("enrichment.json");

    // Build prompt with file paths
    let full_prompt = build_research_prompt(
        &prompt_content,
        &lead,
        &profile_path,
        &people_path,
        &enrichment_path,
        company_overview.as_ref().map(|p| p.content.as_str()),
        company_profile_context.as_deref(),
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
        enrichment_output_path: Some(enrichment_path),
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
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        db::get_active_job_for_entity(&conn, person_id, "person_research")
            .map_err(|e| e.to_string())?
            .map(|job| job.id)
    };
    if let Some(job_id) = existing_job_id {
        eprintln!("[research] Cancelling existing job {} for person {}", job_id, person_id);
        let _ = queue.kill_job(&job_id).await;
    }

    // Get person and optionally lead
    let (person, lead) = {
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        let p = db::get_person_raw(&conn, person_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Person not found".to_string())?;
        let l = if let Some(lead_id) = p.lead_id {
            db::get_lead(&conn, lead_id).map_err(|e| e.to_string())?
        } else {
            None
        };
        (p, l)
    };

    // Update status to in_progress
    {
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        conn.execute(
            "UPDATE people SET research_status = 'in_progress' WHERE id = ?1",
            rusqlite::params![person_id],
        ).map_err(|e| e.to_string())?;
    }

    // Emit event so frontend updates immediately
    emit_person_updated(&app, person_id, person.lead_id);

    // Get prompts (with fallback to defaults) and company profile context
    let (person_prompt_content, company_overview, company_profile_context) = {
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        let pp = db::get_prompt_by_type(&conn, "person").map_err(|e| e.to_string())?;
        let co = db::get_prompt_by_type(&conn, "company_overview").map_err(|e| e.to_string())?;
        let profile_ctx = get_company_profile_context(&conn);

        // Use DB prompt or fall back to default
        let content = pp.map(|p| p.content)
            .or_else(|| get_default_prompt("person").map(String::from));
        (content, co, profile_ctx)
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
    let enrichment_path = person_dir.join("enrichment.json");

    // Build prompt with file path
    let full_prompt = build_person_research_prompt(
        &prompt_content,
        &person,
        lead.as_ref(),
        &profile_path,
        &enrichment_path,
        company_overview.as_ref().map(|p| p.content.as_str()),
        company_profile_context.as_deref(),
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
        enrichment_output_path: Some(enrichment_path),
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

/// Formats the company profile into a useful context string for AI prompts.
/// This provides the AI with information about the user's company (the seller)
/// to better tailor research and scoring to their specific context.
fn format_company_profile_context(profile: &db::CompanyProfile) -> String {
    let mut context = String::from("## Our Company Profile\n\n");
    context.push_str(&format!("**Company:** {}\n", profile.company_name));
    context.push_str(&format!("**Product:** {}\n", profile.product_name));
    context.push_str(&format!("**Website:** {}\n\n", profile.website));

    // Add target audience if available
    if let Ok(audience_json) = serde_json::from_str::<serde_json::Value>(&profile.target_audience) {
        if let Some(audience_array) = audience_json.as_array() {
            if !audience_array.is_empty() {
                context.push_str("**Target Audience:**\n");
                for item in audience_array {
                    if let Some(segment) = item.get("segment").and_then(|v| v.as_str()) {
                        context.push_str(&format!("- {}\n", segment));
                        if let Some(description) = item.get("description").and_then(|v| v.as_str()) {
                            context.push_str(&format!("  {}\n", description));
                        }
                    }
                }
                context.push('\n');
            }
        }
    }

    // Add USPs if available
    if let Ok(usps_json) = serde_json::from_str::<serde_json::Value>(&profile.usps) {
        if let Some(usps_array) = usps_json.as_array() {
            if !usps_array.is_empty() {
                context.push_str("**Unique Selling Propositions:**\n");
                for item in usps_array {
                    if let Some(headline) = item.get("headline").and_then(|v| v.as_str()) {
                        context.push_str(&format!("- {}\n", headline));
                        if let Some(explanation) = item.get("explanation").and_then(|v| v.as_str()) {
                            context.push_str(&format!("  {}\n", explanation));
                        }
                    }
                }
                context.push('\n');
            }
        }
    }

    // Add marketing narrative if available
    if !profile.marketing_narrative.is_empty() {
        context.push_str("**Marketing Narrative:**\n");
        context.push_str(&profile.marketing_narrative);
        context.push('\n');
        context.push('\n');
    }

    // Add sales narrative if available
    if let Ok(sales_json) = serde_json::from_str::<serde_json::Value>(&profile.sales_narrative) {
        if let Some(elevator_pitch) = sales_json.get("elevatorPitch").and_then(|v| v.as_str()) {
            if !elevator_pitch.is_empty() {
                context.push_str("**Sales Narrative - Elevator Pitch:**\n");
                context.push_str(elevator_pitch);
                context.push('\n');
                context.push('\n');
            }
        }
        if let Some(talking_points) = sales_json.get("talkingPoints").and_then(|v| v.as_array()) {
            if !talking_points.is_empty() {
                context.push_str("**Sales Talking Points:**\n");
                for item in talking_points {
                    if let Some(content) = item.get("content").and_then(|v| v.as_str()) {
                        context.push_str(&format!("- {}\n", content));
                    }
                }
                context.push('\n');
            }
        }
    }

    // Add competitors if available
    if let Ok(competitors_json) = serde_json::from_str::<serde_json::Value>(&profile.competitors) {
        if let Some(competitors_array) = competitors_json.as_array() {
            if !competitors_array.is_empty() {
                context.push_str("**Competitors:**\n");
                for item in competitors_array {
                    if let Some(name) = item.get("name").and_then(|v| v.as_str()) {
                        context.push_str(&format!("- {}\n", name));
                    }
                }
                context.push('\n');
            }
        }
    }

    // Add market insights if available
    if let Ok(insights_json) = serde_json::from_str::<serde_json::Value>(&profile.market_insights) {
        if let Some(insights_array) = insights_json.as_array() {
            if !insights_array.is_empty() {
                context.push_str("**Market Insights:**\n");
                for item in insights_array {
                    let category = item.get("category").and_then(|v| v.as_str()).unwrap_or("General");
                    if let Some(content) = item.get("content").and_then(|v| v.as_str()) {
                        context.push_str(&format!("- [{}] {}\n", category, content));
                    }
                }
                context.push('\n');
            }
        }
    }

    context
}

/// Fetches and formats the company profile for use in prompts.
/// Returns None if no profile exists or research wasn't completed.
fn get_company_profile_context(conn: &rusqlite::Connection) -> Option<String> {
    let profile = db::get_company_profile(conn).ok().flatten()?;
    if profile.research_status != "completed" {
        return None;
    }
    Some(format_company_profile_context(&profile))
}

const PEOPLE_JSON_SCHEMA: &str = r#"
The people JSON should be an array of objects with these fields:
- firstName (string)
- lastName (string)
- email (string, optional)
- title (string)
- linkedinUrl (string, optional)
- managementLevel (string, optional) - one of: C-Level, VP, Director, Manager, IC
- yearJoined (number, optional) - the year they joined the company"#;

const LEAD_ENRICHMENT_SCHEMA: &str = r#"This file should contain verified company data in JSON format. Only include fields where you have found reliable data:
```json
{
  "website": "https://company.com",
  "industry": "Technology",
  "subIndustry": "Enterprise Software",
  "employees": 500,
  "employeeRange": "201-500",
  "revenue": 50000000,
  "revenueRange": "$10M-$50M",
  "companyLinkedinUrl": "https://linkedin.com/company/...",
  "city": "San Francisco",
  "state": "California",
  "country": "United States"
}
```

IMPORTANT: Only include fields with verified data. Omit fields if uncertain."#;

const PERSON_ENRICHMENT_SCHEMA: &str = r#"This file should contain verified person data in JSON format. Only include fields where you have found reliable data:
```json
{
  "email": "name@company.com",
  "title": "Senior Vice President of Sales",
  "managementLevel": "VP",
  "linkedinUrl": "https://linkedin.com/in/...",
  "yearJoined": 2020
}
```

Valid managementLevel values: C-Level, VP, Director, Manager, IC
IMPORTANT: Only include fields with verified data. Omit fields if uncertain."#;

fn build_research_prompt(
    prompt: &str,
    lead: &db::Lead,
    profile_path: &std::path::Path,
    people_path: &std::path::Path,
    enrichment_path: &std::path::Path,
    company_overview: Option<&str>,
    company_profile_context: Option<&str>,
) -> String {
    let mut full_prompt = String::new();

    // Add company overview context if available (legacy, for backward compatibility)
    if let Some(overview) = company_overview {
        full_prompt.push_str(&format!("# Company Overview\n\n{}\n\n---\n\n", overview));
    }

    // Add company profile context if available (new structured data)
    if let Some(profile_ctx) = company_profile_context {
        full_prompt.push_str(profile_ctx);
        full_prompt.push_str("---\n\n");
    }

    full_prompt.push_str(prompt);
    full_prompt.push_str(&format!("\n\n# Company Information\n\nCompany Name: {}\n", lead.company_name));

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

    full_prompt.push_str(&format!(
        "\n# Output Files\n\nWrite the company profile to: {}\nWrite the people JSON to: {}\n{}\n",
        profile_path.display(),
        people_path.display(),
        PEOPLE_JSON_SCHEMA
    ));

    full_prompt.push_str(&format!(
        "\n# Enrichment Data\n\nAdditionally, write structured enrichment data to: {}\n\n{}\n",
        enrichment_path.display(),
        LEAD_ENRICHMENT_SCHEMA
    ));

    full_prompt
}

fn build_person_research_prompt(
    prompt: &str,
    person: &db::Person,
    lead: Option<&db::Lead>,
    profile_path: &std::path::Path,
    enrichment_path: &std::path::Path,
    company_overview: Option<&str>,
    company_profile_context: Option<&str>,
) -> String {
    let mut full_prompt = String::new();

    // Add company overview context if available (legacy, for backward compatibility)
    if let Some(overview) = company_overview {
        full_prompt.push_str(&format!("# Company Overview\n\n{}\n\n---\n\n", overview));
    }

    // Add company profile context if available (new structured data)
    if let Some(profile_ctx) = company_profile_context {
        full_prompt.push_str(profile_ctx);
        full_prompt.push_str("---\n\n");
    }

    full_prompt.push_str(prompt);
    full_prompt.push_str(&format!(
        "\n\n# Person Information\n\nName: {} {}\n",
        person.first_name, person.last_name
    ));

    if let Some(title) = &person.title {
        full_prompt.push_str(&format!("Title: {}\n", title));
    }
    if let Some(email) = &person.email {
        full_prompt.push_str(&format!("Email: {}\n", email));
    }
    if let Some(linkedin) = &person.linkedin_url {
        full_prompt.push_str(&format!("LinkedIn: {}\n", linkedin));
    }

    // Add company information if available
    if let Some(l) = lead {
        full_prompt.push_str(&format!("\n# Company Information\n\nCompany: {}\n", l.company_name));
        if let Some(website) = &l.website {
            full_prompt.push_str(&format!("Website: {}\n", website));
        }
    }

    full_prompt.push_str(&format!(
        "\n# Output Files\n\nWrite the person profile to: {}\n\nAdditionally, write structured enrichment data to: {}\n\n{}\n",
        profile_path.display(),
        enrichment_path.display(),
        PERSON_ENRICHMENT_SCHEMA
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
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
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
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        let l = db::get_lead(&conn, lead_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Lead not found".to_string())?;
        let p = db::get_people_for_lead(&conn, lead_id)
            .map_err(|e| e.to_string())?;
        (l, p)
    };

    // Get active scoring config and company profile context
    let (config, company_profile_context) = {
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        let c = db::get_active_scoring_config(&conn)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "No active scoring configuration found".to_string())?;
        let profile_ctx = get_company_profile_context(&conn);
        (c, profile_ctx)
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
    let full_prompt = build_scoring_prompt(&lead, &people, &config, &score_path, company_profile_context.as_deref());

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
        enrichment_output_path: None,
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
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        db::get_active_job_for_entity(&conn, person_id, "conversation")
            .map_err(|e| e.to_string())?
            .map(|job| job.id)
    };
    if let Some(job_id) = existing_job_id {
        eprintln!("[research] Cancelling existing conversation job {} for person {}", job_id, person_id);
        let _ = queue.kill_job(&job_id).await;
    }

    // Get person and optionally lead
    let (person, lead) = {
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        let p = db::get_person_raw(&conn, person_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Person not found".to_string())?;
        let l = if let Some(lead_id) = p.lead_id {
            db::get_lead(&conn, lead_id).map_err(|e| e.to_string())?
        } else {
            None
        };
        (p, l)
    };

    // Get prompts (with fallback to defaults) and company profile context
    let (conversation_prompt_content, company_overview, company_profile_context) = {
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        let cp = db::get_prompt_by_type(&conn, "conversation_topics").map_err(|e| e.to_string())?;
        let co = db::get_prompt_by_type(&conn, "company_overview").map_err(|e| e.to_string())?;
        let profile_ctx = get_company_profile_context(&conn);

        // Use DB prompt or fall back to default
        let content = cp.map(|p| p.content)
            .or_else(|| get_default_prompt("conversation_topics").map(String::from));
        (content, co, profile_ctx)
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
        lead.as_ref(),
        &conversation_path,
        company_overview.as_ref().map(|p| p.content.as_str()),
        company_profile_context.as_deref(),
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
        enrichment_output_path: None,
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
    company_profile_context: Option<&str>,
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

    // Build company profile section for scoring
    let company_profile_section = if let Some(profile_ctx) = company_profile_context {
        format!("{}\n", profile_ctx)
    } else {
        String::new()
    };

    format!(r#"You are a lead scoring analyst. Your task is to evaluate the following company as a sales lead and provide a detailed scoring assessment.

{company_profile_section}COMPANY INFORMATION:
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
    lead: Option<&db::Lead>,
    output_path: &std::path::Path,
    company_overview: Option<&str>,
    company_profile_context: Option<&str>,
) -> String {
    // Format what we do section - prefer company profile over old company_overview
    let what_we_do = if let Some(profile_ctx) = company_profile_context {
        format!("<WhatWeDo>\n{}\n</WhatWeDo>\n\n", profile_ctx)
    } else if let Some(overview) = company_overview {
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

    // Format lead context (handle optional lead)
    let (lead_context, company_profile) = if let Some(l) = lead {
        let context = format!(
            "Company Name: {}\nWebsite: {}\nIndustry: {}\nSub-Industry: {}\nEmployees: {}\nEmployee Range: {}\nRevenue: {}\nRevenue Range: {}\nLinkedIn: {}\nCity: {}\nState: {}\nCountry: {}",
            l.company_name,
            l.website.as_deref().unwrap_or("N/A"),
            l.industry.as_deref().unwrap_or("N/A"),
            l.sub_industry.as_deref().unwrap_or("N/A"),
            l.employees.map(|e| e.to_string()).unwrap_or_else(|| "N/A".to_string()),
            l.employee_range.as_deref().unwrap_or("N/A"),
            l.revenue.map(|r| r.to_string()).unwrap_or_else(|| "N/A".to_string()),
            l.revenue_range.as_deref().unwrap_or("N/A"),
            l.company_linkedin_url.as_deref().unwrap_or("N/A"),
            l.city.as_deref().unwrap_or("N/A"),
            l.state.as_deref().unwrap_or("N/A"),
            l.country.as_deref().unwrap_or("N/A")
        );
        let profile = if let Some(profile) = &l.company_profile {
            format!("\n\nCompany Research Profile:\n{}", profile)
        } else {
            String::new()
        };
        (context, profile)
    } else {
        ("No company associated".to_string(), String::new())
    };

    // Add person profile if available
    let person_profile = if let Some(profile) = &person.person_profile {
        format!("\n\nPerson Research Profile:\n{}", profile)
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

// ============================================================================
// Company Profile Research (User's company for onboarding)
// ============================================================================

const COMPANY_PROFILE_ENTITY_ID: i64 = -1; // Sentinel value for user's company profile

#[tauri::command]
pub async fn start_company_profile_research(
    app: AppHandle,
    state: State<'_, DbState>,
    queue: State<'_, JobQueue>,
    company_name: String,
    product_name: String,
    website: String,
    on_event: Channel<StreamEvent>,
) -> Result<ResearchResult, String> {
    // Check for existing active job and cancel it if found
    let existing_job_id = {
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        db::get_active_job_for_entity(&conn, COMPANY_PROFILE_ENTITY_ID, "company_profile_research")
            .map_err(|e| e.to_string())?
            .map(|job| job.id)
    };
    if let Some(job_id) = existing_job_id {
        eprintln!("[company_profile] Cancelling existing job {}", job_id);
        let _ = queue.kill_job(&job_id).await;
    }

    // Create/update company profile record with in_progress status
    {
        let conn = state.conn.lock().map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
        let _ = db::save_company_profile(
            &conn,
            &company_name,
            &product_name,
            &website,
            None, None, None, None, None, None,  // target_audience, usps, marketing_narrative, sales_narrative, competitors, market_insights
            None,                                 // raw_analysis
            Some("in_progress"),                   // research_status
        ).map_err(|e| e.to_string())?;
    }

    // Emit event so frontend updates immediately
    crate::events::emit_company_profile_updated(&app);

    // Get the company profile research prompt
    let prompt_content = get_default_prompt("company_profile_research")
        .map(String::from)
        .ok_or_else(|| "No company profile research prompt found".to_string())?;

    // Replace template variables
    let prompt_content = prompt_content
        .replace("{{company_name}}", &company_name)
        .replace("{{product_name}}", &product_name)
        .replace("{{website}}", &website);

    // Set up output directory
    let data_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    let output_dir = data_dir.join("company_profile");
    fs::create_dir_all(&output_dir).ok();

    let profile_path = output_dir.join("profile_analysis.json");
    let enrichment_path = output_dir.join("enrichment.json");

    // Build full prompt
    let full_prompt = format!(
        "{}\n\n## Output File Paths\n\n- Profile analysis: {}\n- Enrichment data: {}",
        prompt_content,
        profile_path.display(),
        enrichment_path.display()
    );

    // Send initial event
    let _ = on_event.send(StreamEvent {
        job_id: "pending".to_string(),
        event_type: "info".to_string(),
        content: format!("Starting company profile research for {}...", company_name),
        timestamp: chrono::Utc::now().timestamp_millis(),
    });

    // Start job
    let working_dir = std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| ".".to_string());

    let metadata = JobMetadata {
        job_type: JobType::CompanyProfileResearch,
        entity_id: COMPANY_PROFILE_ENTITY_ID,
        primary_output_path: profile_path,
        secondary_output_path: None,
        enrichment_output_path: Some(enrichment_path),
    };

    let entity_label = company_name.clone();

    // Clone values for use in callback (required for 'static lifetime)
    let company_name_clone = company_name.clone();
    let product_name_clone = product_name.clone();
    let website_clone = website.clone();

    // Clone app handle for callback
    let app_handle_for_callback = app.app_handle().clone();

    // Note: We don't need EntityContext for company profile research
    // since there's no entity status to rollback

    let job_id = queue.start_job_with_callback(
        app.app_handle().clone(),
        full_prompt,
        working_dir,
        on_event,
        metadata,
        entity_label,
        None, // No entity context needed for company profile
        move |meta, output, success| {
            // Handle completion - parse and save results
            if success {
                // Get DbState from app handle (like queue.rs does)
                let result: Result<(), Box<dyn std::error::Error>> = (|| {
                    let db_state: tauri::State<'_, crate::db::DbState> = app_handle_for_callback.state();
                    let conn_guard = db_state.conn.lock().map_err(|e| format!("Lock error: {}", e))?;
                    let conn = &*conn_guard;

                    // Try multiple sources for the JSON data:
                    // 1. First, try the enrichment file (if AI wrote to files)
                    // 2. Then, try parsing JSON from the accumulated stdout
                    let json_value = if let Some(ref enrichment_path) = meta.enrichment_output_path {
                        match fs::read_to_string(enrichment_path) {
                            Ok(content) => {
                                eprintln!("[company_profile] Reading from enrichment file");
                                serde_json::from_str::<serde_json::Value>(&content).ok()
                            }
                            Err(_) => {
                                eprintln!("[company_profile] Enrichment file not found, trying to parse from stdout");
                                // Try to extract JSON from stdout output
                                extract_json_from_stdout(&output)
                            }
                        }
                    } else {
                        eprintln!("[company_profile] No enrichment path, trying to parse from stdout");
                        extract_json_from_stdout(&output)
                    };

                    if let Some(json_value) = json_value {
                        // Extract structured data and save to database
                        let target_audience = json_value.get("targetAudience")
                            .and_then(|v| serde_json::to_string(v).ok());
                        let usps = json_value.get("usps")
                            .and_then(|v| serde_json::to_string(v).ok());
                        let sales_narrative = json_value.get("salesNarrative")
                            .and_then(|v| serde_json::to_string(v).ok());
                        let competitors = json_value.get("competitors")
                            .and_then(|v| serde_json::to_string(v).ok());
                        let market_insights = json_value.get("marketInsights")
                            .and_then(|v| serde_json::to_string(v).ok());

                        // Use the raw JSON string for raw_analysis
                        let raw_analysis = serde_json::to_string(&json_value).unwrap_or_else(|_| output.clone());

                        // Generate a basic marketing narrative if not present in the output
                        let marketing_narrative = json_value.get("marketingNarrative")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string())
                            .unwrap_or_else(|| format!("# Marketing Narrative\n\nAI-generated analysis for {}\n\nBased on the research of {}, we've identified key insights about your target audience, unique selling propositions, and market position.", company_name_clone, website_clone));

                        // Save the structured data
                        match db::save_company_profile(
                            conn,
                            &company_name_clone,
                            &product_name_clone,
                            &website_clone,
                            target_audience.as_deref(),
                            usps.as_deref(),
                            Some(&marketing_narrative),
                            sales_narrative.as_deref(),
                            competitors.as_deref(),
                            market_insights.as_deref(),
                            Some(&raw_analysis),
                            Some("completed"),
                        ) {
                            Ok(_) => eprintln!("[company_profile] Profile saved successfully"),
                            Err(e) => eprintln!("[company_profile] Error saving profile: {}", e),
                        }

                        // Clean up output files
                        if let Some(ref enrichment_path) = meta.enrichment_output_path {
                            let _ = std::fs::remove_file(enrichment_path);
                        }
                        let _ = std::fs::remove_file(&meta.primary_output_path);
                    } else {
                        eprintln!("[company_profile] Failed to extract JSON from any source");
                        // Mark as failed since we couldn't parse the output
                        let _ = db::update_company_profile_research_status(conn, "failed");
                    }
                    Ok(())
                })();

                if let Err(e) = result {
                    eprintln!("[company_profile] Error in completion callback: {:?}", e);
                }
            } else {
                // Mark as failed - use block to ensure lock is dropped
                let _ = (|| -> Result<(), String> {
                    let db_state: tauri::State<'_, crate::db::DbState> = app_handle_for_callback.state();
                    let conn_guard = db_state.conn.lock().map_err(|e| e.to_string())?;
                    db::update_company_profile_research_status(&*conn_guard, "failed").map_err(|e| e.to_string())?;
                    Ok(())
                })();
            }

            // Emit completion event
            crate::events::emit_company_profile_updated(&app_handle_for_callback);
        },
    ).await?;

    Ok(ResearchResult {
        job_id,
        status: "started".to_string(),
    })
}
