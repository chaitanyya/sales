use tauri::State;
use crate::db::DbState;
use crate::crypto::{get_device_fingerprint, TokenEncryption};
use crate::subscription::{
    save_subscription_state,
    get_subscription_status,
    check_lockout_status,
    load_subscription_state,
};

/// Get current subscription status
#[tauri::command]
pub async fn get_subscription_status(
    state: State<'_, DbState>,
) -> Result<crate::db::schema::SubscriptionStatus, String> {
    get_subscription_status(&state.conn).map_err(|e| e.to_string())
}

/// Check if the user is locked out
#[tauri::command]
pub async fn check_lockout(
    state: State<'_, DbState>,
) -> Result<crate::db::schema::LockoutStatus, String> {
    check_lockout_status(&state.conn).map_err(|e| e.to_string())
}

/// Validate and store subscription token from Clerk
/// This should be called when the user logs in
#[tauri::command]
pub async fn validate_subscription_token(
    token: String,
    subscription_status: String,
    subscription_expires_at: Option<i64>,
    state: State<'_, DbState>,
) -> Result<(), String> {
    // Get device fingerprint
    let device_id = get_device_fingerprint()?;

    // Encrypt the token with device-bound key
    let encryption = TokenEncryption::from_device_fingerprint(&device_id);
    let encrypted = encryption.encrypt_token(&token)?;

    // Save to database
    save_subscription_state(
        &state.conn,
        encrypted,
        subscription_status,
        subscription_expires_at,
        &device_id,
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Update subscription status (for Clerk webhooks)
#[tauri::command]
pub async fn update_subscription_status(
    subscription_status: String,
    subscription_expires_at: Option<i64>,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    // Load current state to get the encrypted token and device fingerprint
    let current = load_subscription_state(&state.conn)
        .map_err(|e| e.to_string())?
        .ok_or("No subscription state found")?;

    // Update status while preserving token
    let now = chrono::Utc::now().timestamp();
    let grace_period_ends_at = if subscription_status == "active" {
        None
    } else {
        Some(now + (7 * 24 * 60 * 60)) // 7 days
    };

    conn.execute(
        "UPDATE subscription_state
         SET subscription_status = ?1, subscription_expires_at = ?2, grace_period_ends_at = ?3
         WHERE id = 1",
        [subscription_status, subscription_expires_at, grace_period_ends_at],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Clear subscription state (for testing or logout)
#[tauri::command]
pub async fn clear_subscription_state(
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM subscription_state WHERE id = 1", [])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Get the decrypted token (for internal use - not exposed to frontend)
/// This is used by the renewal task to get the current token for refresh
pub fn get_current_token(state: &DbState) -> Result<String, String> {
    let subscription_state = load_subscription_state(&state.conn)
        .map_err(|e| e.to_string())?
        .ok_or("No subscription state found")?;

    // Verify device fingerprint
    let device_id = get_device_fingerprint()?;
    if device_id != subscription_state.device_fingerprint {
        return Err("Device fingerprint mismatch".to_string());
    }

    // Decrypt token
    let encryption = TokenEncryption::from_device_fingerprint(&device_id);
    encryption.decrypt_token(&subscription_state.encrypted_token)
}
