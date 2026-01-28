use tauri::{AppHandle, State};
use crate::db::{self, DbState, Lead, LeadWithScore, NewLead, NewPerson, ParsedLeadScore, ParsedScoringConfig, Person, PersonWithCompany};
use crate::events;

// ============================================================================
// Lead Commands
// ============================================================================

#[tauri::command]
pub fn get_lead(state: State<'_, DbState>, id: i64, clerk_org_id: Option<String>) -> Result<Option<Lead>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    db::get_lead(&conn, id, org_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_leads(state: State<'_, DbState>, clerk_org_id: Option<String>) -> Result<Vec<Lead>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    db::get_all_leads(&conn, org_id).map_err(|e| e.to_string())
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
pub fn get_adjacent_leads(state: State<'_, DbState>, current_id: i64, clerk_org_id: Option<String>) -> Result<AdjacentLeadsResult, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    let (prev, next, idx, total) = db::get_adjacent_leads(&conn, current_id, org_id).map_err(|e| e.to_string())?;
    Ok(AdjacentLeadsResult {
        prev_lead: prev,
        next_lead: next,
        current_index: idx,
        total,
    })
}

#[tauri::command]
pub fn insert_lead(app: AppHandle, state: State<'_, DbState>, data: NewLead, clerk_org_id: Option<String>) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    let id = db::insert_lead(&conn, &data, org_id).map_err(|e| e.to_string())?;
    drop(conn);
    events::emit_lead_created(&app, id, clerk_org_id);
    Ok(id)
}

#[tauri::command]
pub fn update_lead_user_status(app: AppHandle, state: State<'_, DbState>, lead_id: i64, status: String, clerk_org_id: Option<String>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    db::update_lead_user_status(&conn, lead_id, &status, org_id).map_err(|e| e.to_string())?;
    drop(conn);
    events::emit_lead_updated(&app, lead_id, clerk_org_id);
    Ok(())
}

#[tauri::command]
pub fn delete_leads(app: AppHandle, state: State<'_, DbState>, lead_ids: Vec<i64>, clerk_org_id: Option<String>) -> Result<usize, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    let deleted = db::delete_leads(&conn, &lead_ids, org_id).map_err(|e| e.to_string())?;
    drop(conn);
    if deleted > 0 {
        events::emit_lead_deleted(&app, lead_ids, clerk_org_id);
    }
    Ok(deleted)
}

// ============================================================================
// Person Commands
// ============================================================================

#[tauri::command]
pub fn get_person(state: State<'_, DbState>, id: i64, clerk_org_id: Option<String>) -> Result<Option<PersonWithCompany>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    db::get_person(&conn, id, org_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_person_raw(state: State<'_, DbState>, id: i64, clerk_org_id: Option<String>) -> Result<Option<Person>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    db::get_person_raw(&conn, id, org_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_people_for_lead(state: State<'_, DbState>, lead_id: i64, clerk_org_id: Option<String>) -> Result<Vec<Person>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    db::get_people_for_lead(&conn, lead_id, org_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_people(state: State<'_, DbState>, clerk_org_id: Option<String>) -> Result<Vec<PersonWithCompany>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    db::get_all_people(&conn, org_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_adjacent_people(state: State<'_, DbState>, current_id: i64, clerk_org_id: Option<String>) -> Result<AdjacentLeadsResult, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    let (prev, next, idx, total) = db::get_adjacent_people(&conn, current_id, org_id).map_err(|e| e.to_string())?;
    Ok(AdjacentLeadsResult {
        prev_lead: prev,
        next_lead: next,
        current_index: idx,
        total,
    })
}

#[tauri::command]
pub fn insert_person(state: State<'_, DbState>, data: NewPerson, clerk_org_id: Option<String>) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    db::insert_person(&conn, &data, org_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_person_user_status(app: AppHandle, state: State<'_, DbState>, person_id: i64, status: String, clerk_org_id: Option<String>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    // Get lead_id before update for event emission
    let lead_id = db::get_person_raw(&conn, person_id, org_id)
        .ok()
        .flatten()
        .map(|p| p.lead_id);
    db::update_person_user_status(&conn, person_id, &status, org_id).map_err(|e| e.to_string())?;
    drop(conn);
    if let Some(lid) = lead_id {
        events::emit_person_updated(&app, person_id, lid, clerk_org_id);
    }
    Ok(())
}

#[tauri::command]
pub fn delete_people(app: AppHandle, state: State<'_, DbState>, person_ids: Vec<i64>, clerk_org_id: Option<String>) -> Result<usize, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    let deleted = db::delete_people(&conn, &person_ids, org_id).map_err(|e| e.to_string())?;
    drop(conn);
    if deleted > 0 {
        events::emit_person_deleted(&app, person_ids, clerk_org_id);
    }
    Ok(deleted)
}

// ============================================================================
// Scoring Config Commands
// ============================================================================

#[tauri::command]
pub fn get_active_scoring_config(state: State<'_, DbState>, clerk_org_id: Option<String>) -> Result<Option<ParsedScoringConfig>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    db::get_active_scoring_config(&conn, org_id).map_err(|e| e.to_string())
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
    clerk_org_id: Option<String>,
) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    db::save_scoring_config(
        &conn,
        &name,
        &required_characteristics,
        &demand_signifiers,
        tier_hot_min,
        tier_warm_min,
        tier_nurture_min,
        id,
        org_id,
    )
    .map_err(|e| e.to_string())
}

// ============================================================================
// Lead Score Commands
// ============================================================================

#[tauri::command]
pub fn get_lead_score(state: State<'_, DbState>, lead_id: i64, clerk_org_id: Option<String>) -> Result<Option<ParsedLeadScore>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    db::get_lead_score(&conn, lead_id, org_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_leads_with_scores(state: State<'_, DbState>, clerk_org_id: Option<String>) -> Result<Vec<LeadWithScore>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    db::get_leads_with_scores(&conn, org_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_unscored_leads(state: State<'_, DbState>, clerk_org_id: Option<String>) -> Result<Vec<Lead>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    db::get_unscored_leads(&conn, org_id).map_err(|e| e.to_string())
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
    clerk_org_id: Option<String>,
) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
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
        org_id,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_lead_score(state: State<'_, DbState>, lead_id: i64, clerk_org_id: Option<String>) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    db::delete_lead_score(&conn, lead_id, org_id).map_err(|e| e.to_string())
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
pub fn get_onboarding_status(state: State<'_, DbState>, clerk_org_id: Option<String>) -> Result<OnboardingStatus, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    // Use parameterized queries to prevent SQL injection
    let (company_overview_sql, company_overview_params): (&str, Vec<&dyn rusqlite::ToSql>) = if let Some(org_id) = &clerk_org_id {
        (
            "SELECT EXISTS(SELECT 1 FROM prompts WHERE type = 'company_overview' AND (clerk_org_id IS NULL OR clerk_org_id = ?1))",
            vec![org_id as &dyn rusqlite::ToSql],
        )
    } else {
        (
            "SELECT EXISTS(SELECT 1 FROM prompts WHERE type = 'company_overview')",
            vec![],
        )
    };

    let (lead_sql, lead_params): (&str, Vec<&dyn rusqlite::ToSql>) = if let Some(org_id) = &clerk_org_id {
        (
            "SELECT EXISTS(SELECT 1 FROM leads WHERE clerk_org_id IS NULL OR clerk_org_id = ?1)",
            vec![org_id as &dyn rusqlite::ToSql],
        )
    } else {
        (
            "SELECT EXISTS(SELECT 1 FROM leads)",
            vec![],
        )
    };

    let (researched_lead_sql, researched_lead_params): (&str, Vec<&dyn rusqlite::ToSql>) = if let Some(org_id) = &clerk_org_id {
        (
            "SELECT EXISTS(SELECT 1 FROM leads WHERE research_status = 'completed' AND (clerk_org_id IS NULL OR clerk_org_id = ?1))",
            vec![org_id as &dyn rusqlite::ToSql],
        )
    } else {
        (
            "SELECT EXISTS(SELECT 1 FROM leads WHERE research_status = 'completed')",
            vec![],
        )
    };

    let (scored_lead_sql, scored_lead_params): (&str, Vec<&dyn rusqlite::ToSql>) = if let Some(org_id) = &clerk_org_id {
        (
            "SELECT EXISTS(SELECT 1 FROM lead_scores ls JOIN leads l ON ls.lead_id = l.id WHERE l.clerk_org_id IS NULL OR l.clerk_org_id = ?1)",
            vec![org_id as &dyn rusqlite::ToSql],
        )
    } else {
        (
            "SELECT EXISTS(SELECT 1 FROM lead_scores ls JOIN leads l ON ls.lead_id = l.id)",
            vec![],
        )
    };

    let (researched_person_sql, researched_person_params): (&str, Vec<&dyn rusqlite::ToSql>) = if let Some(org_id) = &clerk_org_id {
        (
            "SELECT EXISTS(SELECT 1 FROM people WHERE research_status = 'completed' AND (clerk_org_id IS NULL OR clerk_org_id = ?1))",
            vec![org_id as &dyn rusqlite::ToSql],
        )
    } else {
        (
            "SELECT EXISTS(SELECT 1 FROM people WHERE research_status = 'completed')",
            vec![],
        )
    };

    let (conversation_topics_sql, conversation_topics_params): (&str, Vec<&dyn rusqlite::ToSql>) = if let Some(org_id) = &clerk_org_id {
        (
            "SELECT EXISTS(SELECT 1 FROM people WHERE conversation_topics IS NOT NULL AND conversation_topics != '' AND (clerk_org_id IS NULL OR clerk_org_id = ?1))",
            vec![org_id as &dyn rusqlite::ToSql],
        )
    } else {
        (
            "SELECT EXISTS(SELECT 1 FROM people WHERE conversation_topics IS NOT NULL AND conversation_topics != '')",
            vec![],
        )
    };

    // Check for company overview prompt
    let has_company_overview: bool = conn.query_row(
        company_overview_sql,
        company_overview_params.as_slice(),
        |row| row.get(0)
    ).unwrap_or(false);

    // Check for any lead
    let has_lead: bool = conn.query_row(
        lead_sql,
        lead_params.as_slice(),
        |row| row.get(0)
    ).unwrap_or(false);

    // Check for researched lead
    let has_researched_lead: bool = conn.query_row(
        researched_lead_sql,
        researched_lead_params.as_slice(),
        |row| row.get(0)
    ).unwrap_or(false);

    // Check for scored lead
    let has_scored_lead: bool = conn.query_row(
        scored_lead_sql,
        scored_lead_params.as_slice(),
        |row| row.get(0)
    ).unwrap_or(false);

    // Check for researched person
    let has_researched_person: bool = conn.query_row(
        researched_person_sql,
        researched_person_params.as_slice(),
        |row| row.get(0)
    ).unwrap_or(false);

    // Check for conversation topics
    let has_conversation_topics: bool = conn.query_row(
        conversation_topics_sql,
        conversation_topics_params.as_slice(),
        |row| row.get(0)
    ).unwrap_or(false);

    Ok(OnboardingStatus {
        has_company_overview,
        has_lead,
        has_researched_lead,
        has_scored_lead,
        has_researched_person,
        has_conversation_topics,
    })
}
