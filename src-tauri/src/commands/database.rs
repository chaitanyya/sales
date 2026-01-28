use tauri::{AppHandle, State};
use crate::db::{self, DbState, Lead, LeadWithScore, NewLead, NewPerson, ParsedLeadScore, ParsedScoringConfig, Person, PersonWithCompany};
use crate::events;

// ============================================================================
// Lead Commands
// ============================================================================

#[tauri::command]
pub fn get_lead(state: State<'_, DbState>, id: i64) -> Result<Option<Lead>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_lead(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_leads(state: State<'_, DbState>) -> Result<Vec<Lead>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_all_leads(&conn).map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdjacentLeadsResult {
    pub prev_lead: Option<i64>,
    pub next_lead: Option<i64>,
    pub current_index: usize,
    pub total: usize,
}

#[tauri::command]
pub fn get_adjacent_leads(state: State<'_, DbState>, current_id: i64) -> Result<AdjacentLeadsResult, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let (prev, next, idx, total) = db::get_adjacent_leads(&conn, current_id).map_err(|e| e.to_string())?;
    Ok(AdjacentLeadsResult {
        prev_lead: prev,
        next_lead: next,
        current_index: idx,
        total,
    })
}

#[tauri::command]
pub fn insert_lead(app: AppHandle, state: State<'_, DbState>, data: NewLead) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let id = db::insert_lead(&conn, &data).map_err(|e| e.to_string())?;
    drop(conn);
    events::emit_lead_created(&app, id);
    Ok(id)
}

#[tauri::command]
pub fn update_lead_user_status(app: AppHandle, state: State<'_, DbState>, lead_id: i64, status: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::update_lead_user_status(&conn, lead_id, &status).map_err(|e| e.to_string())?;
    drop(conn);
    events::emit_lead_updated(&app, lead_id);
    Ok(())
}

#[tauri::command]
pub fn delete_leads(app: AppHandle, state: State<'_, DbState>, lead_ids: Vec<i64>) -> Result<usize, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let deleted = db::delete_leads(&conn, &lead_ids).map_err(|e| e.to_string())?;
    drop(conn);
    if deleted > 0 {
        events::emit_lead_deleted(&app, lead_ids);
    }
    Ok(deleted)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkUploadResult {
    pub success_count: usize,
    pub error_count: usize,
    pub errors: Vec<String>,
}

#[tauri::command]
pub fn insert_leads_bulk(app: AppHandle, state: State<'_, DbState>, leads: Vec<NewLead>) -> Result<BulkUploadResult, String> {
    println!("[insert_leads_bulk] Received {} leads to insert", leads.len());
    for (i, lead) in leads.iter().enumerate() {
        println!("[insert_leads_bulk] Lead {}: company_name={:?}, website={:?}", i, lead.company_name, lead.website);
    }

    let mut conn = state.conn.lock().map_err(|e| {
        println!("[insert_leads_bulk] Failed to lock connection: {}", e);
        e.to_string()
    })?;

    match db::insert_leads_bulk(&mut conn, &leads) {
        Ok(count) => {
            println!("[insert_leads_bulk] Successfully inserted {} leads", count);
            drop(conn);
            events::emit_leads_bulk_created(&app, count);
            Ok(BulkUploadResult {
                success_count: count,
                error_count: 0,
                errors: vec![],
            })
        }
        Err(e) => {
            println!("[insert_leads_bulk] Insert failed: {}", e);
            Ok(BulkUploadResult {
                success_count: 0,
                error_count: leads.len(),
                errors: vec![e.to_string()],
            })
        }
    }
}

#[tauri::command]
pub fn insert_people_bulk(state: State<'_, DbState>, people: Vec<NewPerson>) -> Result<BulkUploadResult, String> {
    let mut conn = state.conn.lock().map_err(|e| e.to_string())?;
    match db::insert_people_bulk(&mut conn, &people) {
        Ok(count) => Ok(BulkUploadResult {
            success_count: count,
            error_count: 0,
            errors: vec![],
        }),
        Err(e) => Ok(BulkUploadResult {
            success_count: 0,
            error_count: people.len(),
            errors: vec![e.to_string()],
        }),
    }
}

// ============================================================================
// Person Commands
// ============================================================================

#[tauri::command]
pub fn get_person(state: State<'_, DbState>, id: i64) -> Result<Option<PersonWithCompany>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_person(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_person_raw(state: State<'_, DbState>, id: i64) -> Result<Option<Person>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_person_raw(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_people_for_lead(state: State<'_, DbState>, lead_id: i64) -> Result<Vec<Person>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_people_for_lead(&conn, lead_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_people(state: State<'_, DbState>) -> Result<Vec<PersonWithCompany>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_all_people(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_adjacent_people(state: State<'_, DbState>, current_id: i64) -> Result<AdjacentLeadsResult, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let (prev, next, idx, total) = db::get_adjacent_people(&conn, current_id).map_err(|e| e.to_string())?;
    Ok(AdjacentLeadsResult {
        prev_lead: prev,
        next_lead: next,
        current_index: idx,
        total,
    })
}

#[tauri::command]
pub fn insert_person(state: State<'_, DbState>, data: NewPerson) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::insert_person(&conn, &data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_person_user_status(app: AppHandle, state: State<'_, DbState>, person_id: i64, status: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    // Get lead_id before update for event emission
    let lead_id = db::get_person_raw(&conn, person_id)
        .ok()
        .flatten()
        .map(|p| p.lead_id);
    db::update_person_user_status(&conn, person_id, &status).map_err(|e| e.to_string())?;
    drop(conn);
    if let Some(lid) = lead_id {
        events::emit_person_updated(&app, person_id, lid);
    }
    Ok(())
}

#[tauri::command]
pub fn delete_people(app: AppHandle, state: State<'_, DbState>, person_ids: Vec<i64>) -> Result<usize, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let deleted = db::delete_people(&conn, &person_ids).map_err(|e| e.to_string())?;
    drop(conn);
    if deleted > 0 {
        events::emit_person_deleted(&app, person_ids);
    }
    Ok(deleted)
}

// ============================================================================
// Scoring Config Commands
// ============================================================================

#[tauri::command]
pub fn get_active_scoring_config(state: State<'_, DbState>) -> Result<Option<ParsedScoringConfig>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_active_scoring_config(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_scoring_config(
    state: State<'_, DbState>,
    name: String,
    required_characteristics: String,
    demand_signifiers: String,
    tier_hot_min: i64,
    tier_warm_min: i64,
    tier_nurture_min: i64,
    id: Option<i64>,
) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::save_scoring_config(
        &conn,
        &name,
        &required_characteristics,
        &demand_signifiers,
        tier_hot_min,
        tier_warm_min,
        tier_nurture_min,
        id,
    )
    .map_err(|e| e.to_string())
}

// ============================================================================
// Lead Score Commands
// ============================================================================

#[tauri::command]
pub fn get_lead_score(state: State<'_, DbState>, lead_id: i64) -> Result<Option<ParsedLeadScore>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_lead_score(&conn, lead_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_leads_with_scores(state: State<'_, DbState>) -> Result<Vec<LeadWithScore>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_leads_with_scores(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_unscored_leads(state: State<'_, DbState>) -> Result<Vec<Lead>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_unscored_leads(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_lead_score(
    state: State<'_, DbState>,
    lead_id: i64,
    config_id: i64,
    passes_requirements: bool,
    requirement_results: String,
    total_score: i64,
    score_breakdown: String,
    tier: String,
    scoring_notes: Option<String>,
) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::save_lead_score(
        &conn,
        lead_id,
        config_id,
        passes_requirements,
        &requirement_results,
        total_score,
        &score_breakdown,
        &tier,
        scoring_notes.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_lead_score(state: State<'_, DbState>, lead_id: i64) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::delete_lead_score(&conn, lead_id).map_err(|e| e.to_string())
}

// ============================================================================
// Onboarding Commands
// ============================================================================

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OnboardingStatus {
    pub has_company_overview: bool,
    pub has_lead: bool,
    pub has_researched_lead: bool,
    pub has_scored_lead: bool,
    pub has_researched_person: bool,
    pub has_conversation_topics: bool,
}

#[tauri::command]
pub fn get_onboarding_status(state: State<'_, DbState>) -> Result<OnboardingStatus, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    // Check for company overview prompt
    let has_company_overview: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM prompts WHERE type = 'company_overview')",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    // Check for any lead
    let has_lead: bool = conn
        .query_row("SELECT EXISTS(SELECT 1 FROM leads)", [], |row| row.get(0))
        .unwrap_or(false);

    // Check for researched lead
    let has_researched_lead: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM leads WHERE research_status = 'completed')",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    // Check for scored lead
    let has_scored_lead: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM lead_scores ls JOIN leads l ON ls.lead_id = l.id)",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    // Check for researched person
    let has_researched_person: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM people WHERE research_status = 'completed')",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    // Check for conversation topics
    let has_conversation_topics: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM people WHERE conversation_topics IS NOT NULL AND conversation_topics != '')",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    Ok(OnboardingStatus {
        has_company_overview,
        has_lead,
        has_researched_lead,
        has_scored_lead,
        has_researched_person,
        has_conversation_topics,
    })
}
