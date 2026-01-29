use tauri::State;
use crate::db::{self, DbState, Job, JobLog, StagingHealth};

// ============================================================================
// Job Commands
// ============================================================================

#[tauri::command]
pub async fn get_jobs_active(
    state: State<'_, DbState>,
) -> Result<Vec<Job>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_active_jobs_db(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_jobs_recent(
    state: State<'_, DbState>,
    limit: Option<i64>,
) -> Result<Vec<Job>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_recent_jobs(&conn, limit.unwrap_or(20)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_job_by_id(
    state: State<'_, DbState>,
    job_id: String,
) -> Result<Option<Job>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_job(&conn, &job_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_job_logs_cmd(
    state: State<'_, DbState>,
    job_id: String,
    after_sequence: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<JobLog>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_job_logs_with_staging(&conn, &job_id, after_sequence, limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cleanup_old_jobs_cmd(
    state: State<'_, DbState>,
    days: Option<i64>,
) -> Result<usize, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::cleanup_old_jobs(&conn, days.unwrap_or(7)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_job_cmd(
    state: State<'_, DbState>,
    job_id: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::delete_job(&conn, &job_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_staging_health(
    state: State<'_, DbState>,
) -> Result<StagingHealth, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_staging_health(&conn).map_err(|e| e.to_string())
}
