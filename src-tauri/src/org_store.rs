use crate::db::schema::{OrgBinding, MachineBinding};
use rusqlite::{Connection, Result, params, OptionalExtension};
use std::sync::{Arc, Mutex};

/// Initialize org_binding and machine_binding tables
pub fn init_org_tables(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS org_binding (
            org_id TEXT PRIMARY KEY,
            org_name TEXT NOT NULL,
            bound_at INTEGER NOT NULL,
            bound_by_user_id TEXT NOT NULL,
            bound_by_user_email TEXT NOT NULL,
            machine_id TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS machine_binding (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            machine_id TEXT NOT NULL UNIQUE
        )",
        [],
    )?;

    Ok(())
}

/// Get the current org binding (if any)
pub fn get_org_binding(conn: &Arc<Mutex<Connection>>) -> Result<Option<OrgBinding>, String> {
    let conn = conn.lock().map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT org_id, org_name, bound_at, bound_by_user_id, bound_by_user_email, machine_id
         FROM org_binding LIMIT 1",
        [],
        |row| {
            Ok(OrgBinding {
                org_id: row.get(0)?,
                org_name: row.get(1)?,
                bound_at: row.get(2)?,
                bound_by_user_id: row.get(3)?,
                bound_by_user_email: row.get(4)?,
                machine_id: row.get(5)?,
            })
        },
    )
    .optional()
    .map_err(|e| e.to_string())
}

/// Save org binding (only works if no binding exists or for same org)
pub fn save_org_binding(
    conn: &Arc<Mutex<Connection>>,
    binding: &OrgBinding,
) -> Result<(), String> {
    let conn = conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO org_binding (org_id, org_name, bound_at, bound_by_user_id, bound_by_user_email, machine_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            &binding.org_id,
            &binding.org_name,
            binding.bound_at,
            &binding.bound_by_user_id,
            &binding.bound_by_user_email,
            &binding.machine_id,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Get machine binding
pub fn get_machine_binding(conn: &Arc<Mutex<Connection>>) -> Result<Option<MachineBinding>, String> {
    let conn = conn.lock().map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT id, machine_id FROM machine_binding WHERE id = 1",
        [],
        |row| {
            Ok(MachineBinding {
                id: row.get(0)?,
                machine_id: row.get(1)?,
            })
        },
    )
    .optional()
    .map_err(|e| e.to_string())
}

/// Save machine binding (idempotent)
pub fn save_machine_binding(
    conn: &Arc<Mutex<Connection>>,
    machine_id: &str,
) -> Result<(), String> {
    let conn = conn.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO machine_binding (id, machine_id) VALUES (1, ?1)",
        params![machine_id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Check if the current machine matches the stored machine
pub fn verify_machine_binding(conn: &Arc<Mutex<Connection>>, current_machine_id: &str) -> Result<bool, String> {
    match get_machine_binding(conn)? {
        Some(binding) => Ok(&binding.machine_id == current_machine_id),
        None => Ok(true), // No binding yet, so OK
    }
}

/// Delete org binding (for org change)
pub fn delete_org_binding(conn: &Arc<Mutex<Connection>>) -> Result<(), String> {
    let conn = conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM org_binding", [])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Clear all data (for org change)
pub fn clear_all_data(conn: &Arc<Mutex<Connection>>) -> Result<(), String> {
    let conn = conn.lock().map_err(|e| e.to_string())?;

    conn.execute_batch(
        "DELETE FROM leads;
         DELETE FROM people;
         DELETE FROM job_logs;
         DELETE FROM jobs;
         DELETE FROM lead_scores;
         DELETE FROM prompts;
         DELETE FROM scoring_config;"
    ).map_err(|e| e.to_string())?;

    Ok(())
}
