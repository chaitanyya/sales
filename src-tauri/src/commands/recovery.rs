use tauri::{State, AppHandle};
use crate::db::DbState;
use crate::jobs::recovery::{
    detect_stale_jobs, detect_stuck_leads, detect_stuck_people,
    recover_stale_jobs, recover_stuck_entities,
    StaleJobsResult,
};
use crate::events;

/// Get all stuck entities - entities with "in_progress" status but no active job,
/// and stale jobs that have been running too long
#[tauri::command]
pub fn get_stuck_entities(
    state: State<'_, DbState>,
) -> Result<StaleJobsResult, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let stale_jobs = detect_stale_jobs(&conn)?;
    let stuck_leads = detect_stuck_leads(&conn)?;
    let stuck_people = detect_stuck_people(&conn)?;

    Ok(StaleJobsResult {
        stale_jobs,
        stuck_leads,
        stuck_people,
    })
}

/// Reset an entity's research status
#[tauri::command]
pub fn reset_entity_status(
    app: AppHandle,
    state: State<'_, DbState>,
    entity_type: String,
    entity_id: i64,
    new_status: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    match entity_type.as_str() {
        "lead" => {
            conn.execute(
                "UPDATE leads SET research_status = ?1 WHERE id = ?2",
                rusqlite::params![new_status, entity_id],
            ).map_err(|e| e.to_string())?;
            events::emit_lead_updated(&app, entity_id);
        }
        "person" => {
            conn.execute(
                "UPDATE people SET research_status = ?1 WHERE id = ?2",
                rusqlite::params![new_status, entity_id],
            ).map_err(|e| e.to_string())?;
            // Get lead_id for event
            if let Ok(lead_id) = conn.query_row(
                "SELECT lead_id FROM people WHERE id = ?1",
                rusqlite::params![entity_id],
                |row| row.get::<_, i64>(0),
            ) {
                events::emit_person_updated(&app, entity_id, lead_id);
            }
        }
        _ => {
            return Err(format!("Unknown entity type: {}", entity_type));
        }
    }

    Ok(())
}

/// Recover all stale jobs and stuck entities
#[tauri::command]
pub fn recover_all_stuck(
    app: AppHandle,
    state: State<'_, DbState>,
) -> Result<usize, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let stale_recovered = recover_stale_jobs(&conn, &app)?;
    let stuck_recovered = recover_stuck_entities(&conn, &app)?;

    Ok(stale_recovered + stuck_recovered)
}
