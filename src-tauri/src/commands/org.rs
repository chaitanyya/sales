use tauri::{Emitter, State};
use crate::db::DbState;
use crate::db::schema::OrgBinding;
use crate::org_store::{
    get_org_binding as org_store_get_binding,
    save_org_binding,
    save_machine_binding,
    verify_machine_binding as org_store_verify_machine_binding,
    delete_org_binding,
    clear_all_data,
};
use crate::crypto::get_device_fingerprint;
use std::path::PathBuf;
use std::fs;

/// Get current org binding
#[tauri::command]
pub async fn get_org_binding(
    state: State<'_, DbState>,
) -> Result<Option<OrgBinding>, String> {
    org_store_get_binding(&state.conn)
}

/// Bind the app to an organization (first-time setup)
#[tauri::command]
pub async fn bind_org(
    state: State<'_, DbState>,
    org_id: String,
    org_name: String,
    user_id: String,
    user_email: String,
) -> Result<OrgBinding, String> {
    let machine_id = get_device_fingerprint()?;

    // Check if already bound to a different org
    if let Some(existing) = org_store_get_binding(&state.conn)? {
        if existing.org_id != org_id {
            return Err(format!(
                "Already bound to a different organization: {}. Use change_org_binding instead.",
                existing.org_name
            ));
        }
        return Ok(existing);
    }

    let binding = OrgBinding {
        org_id: org_id.clone(),
        org_name: org_name.clone(),
        bound_at: chrono::Utc::now().timestamp_millis(),
        bound_by_user_id: user_id,
        bound_by_user_email: user_email,
        machine_id: machine_id.clone(),
    };

    save_org_binding(&state.conn, &binding)?;
    save_machine_binding(&state.conn, &machine_id)?;

    Ok(binding)
}

/// Change organization binding (WARNING: Wipes all data)
#[tauri::command]
pub async fn change_org_binding(
    state: State<'_, DbState>,
    app: tauri::AppHandle,
    new_org_id: String,
    new_org_name: String,
    user_id: String,
    user_email: String,
    confirm_wipe: bool,
) -> Result<OrgBinding, String> {
    if !confirm_wipe {
        return Err("Must confirm data wipe".to_string());
    }

    let machine_id = get_device_fingerprint()?;

    // Create automatic backup
    let backup_path = create_backup(&state.conn)?;
    app.emit("org-change-backup-created", &backup_path)
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    // Wipe all data
    clear_all_data(&state.conn)?;

    // Delete old binding
    delete_org_binding(&state.conn)?;

    // Create new binding
    let binding = OrgBinding {
        org_id: new_org_id.clone(),
        org_name: new_org_name.clone(),
        bound_at: chrono::Utc::now().timestamp_millis(),
        bound_by_user_id: user_id,
        bound_by_user_email: user_email,
        machine_id: machine_id.clone(),
    };

    save_org_binding(&state.conn, &binding)?;

    // Notify frontend
    app.emit("org-change-complete", (&new_org_id, &backup_path))
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    Ok(binding)
}

/// Verify machine binding (check if DB is from a different machine)
#[tauri::command]
pub async fn verify_machine_binding(
    state: State<'_, DbState>,
) -> Result<bool, String> {
    let machine_id = get_device_fingerprint()?;
    org_store_verify_machine_binding(&state.conn, &machine_id)
}

/// Get machine ID for display
#[tauri::command]
pub async fn get_machine_id() -> Result<String, String> {
    get_device_fingerprint()
}

/// Create a backup of the database
fn create_backup(_conn: &std::sync::Arc<std::sync::Mutex<rusqlite::Connection>>) -> Result<String, String> {
    let data_dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("liidi");

    // Create backup directory
    let backup_dir = data_dir.join("backups");
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;

    // Create backup filename with timestamp
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let backup_filename = format!("data_backup_{}.db", timestamp);
    let backup_path = backup_dir.join(&backup_filename);

    // Copy the database file
    let db_path = data_dir.join("data.db");
    fs::copy(&db_path, &backup_path)
        .map_err(|e| format!("Failed to copy database: {}", e))?;

    Ok(backup_path.to_string_lossy().to_string())
}

/// Check if org is bound (for first-run detection)
#[tauri::command]
pub async fn is_org_bound(
    state: State<'_, DbState>,
) -> Result<bool, String> {
    Ok(org_store_get_binding(&state.conn)?.is_some())
}
