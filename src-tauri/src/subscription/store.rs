use crate::db::schema::{SubscriptionState, SubscriptionStatus, LockoutStatus};
use rusqlite::{Connection, Result, params};
use std::sync::{Arc, Mutex};

const GRACE_PERIOD_DAYS: i64 = 7;

/// Initialize the subscription_state table
pub fn init_subscription_table(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS subscription_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            encrypted_token TEXT NOT NULL,
            subscription_status TEXT NOT NULL,
            subscription_expires_at INTEGER,
            token_issued_at INTEGER NOT NULL,
            token_expires_at INTEGER NOT NULL,
            last_validated_at INTEGER NOT NULL,
            device_fingerprint TEXT NOT NULL,
            grace_period_ends_at INTEGER
        )",
        [],
    )?;

    Ok(())
}

/// Save or update subscription state
pub fn save_subscription_state(
    conn: &Arc<Mutex<Connection>>,
    encrypted_token: String,
    subscription_status: String,
    subscription_expires_at: Option<i64>,
    device_fingerprint: &str,
) -> Result<SubscriptionState> {
    let now = chrono::Utc::now().timestamp();
    let token_expires_at = now + (24 * 60 * 60); // 24 hours from now

    // Calculate grace period end time
    let grace_period_ends_at = if subscription_status == "active" {
        None
    } else {
        Some(now + (GRACE_PERIOD_DAYS * 24 * 60 * 60))
    };

    let conn = conn.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO subscription_state (
            id, encrypted_token, subscription_status, subscription_expires_at,
            token_issued_at, token_expires_at, last_validated_at,
            device_fingerprint, grace_period_ends_at
        ) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            encrypted_token,
            subscription_status,
            subscription_expires_at,
            now,
            token_expires_at,
            now,
            device_fingerprint,
            grace_period_ends_at,
        ],
    )?;

    Ok(SubscriptionState {
        id: 1,
        encrypted_token,
        subscription_status,
        subscription_expires_at,
        token_issued_at: now,
        token_expires_at,
        last_validated_at: now,
        device_fingerprint: device_fingerprint.to_string(),
        grace_period_ends_at,
    })
}

/// Load subscription state from database
pub fn load_subscription_state(conn: &Arc<Mutex<Connection>>) -> Result<Option<SubscriptionState>> {
    let conn = conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, encrypted_token, subscription_status, subscription_expires_at,
                token_issued_at, token_expires_at, last_validated_at,
                device_fingerprint, grace_period_ends_at
         FROM subscription_state WHERE id = 1"
    )?;

    let result = stmt.query_row([], |row| {
        Ok(SubscriptionState {
            id: row.get(0)?,
            encrypted_token: row.get(1)?,
            subscription_status: row.get(2)?,
            subscription_expires_at: row.get(3)?,
            token_issued_at: row.get(4)?,
            token_expires_at: row.get(5)?,
            last_validated_at: row.get(6)?,
            device_fingerprint: row.get(7)?,
            grace_period_ends_at: row.get(8)?,
        })
    });

    match result {
        Ok(state) => Ok(Some(state)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// Get subscription status for frontend
pub fn get_subscription_status(conn: &Arc<Mutex<Connection>>) -> Result<SubscriptionStatus> {
    let now = chrono::Utc::now().timestamp();

    match load_subscription_state(conn)? {
        Some(state) => {
            let is_valid = is_subscription_valid(&state, now);
            let days_until_lockout = if !is_valid {
                state.grace_period_ends_at.map(|end| {
                    let remaining = end - now;
                    (remaining / (24 * 60 * 60)).max(0)
                })
            } else {
                None
            };

            Ok(SubscriptionStatus {
                status: state.subscription_status,
                is_valid,
                grace_period_ends_at: state.grace_period_ends_at,
                days_until_lockout,
            })
        },
        None => Ok(SubscriptionStatus {
            status: "unknown".to_string(),
            is_valid: false,
            grace_period_ends_at: None,
            days_until_lockout: None,
        }),
    }
}

/// Check if user is locked out
pub fn check_lockout_status(conn: &Arc<Mutex<Connection>>) -> Result<LockoutStatus> {
    let now = chrono::Utc::now().timestamp();

    match load_subscription_state(conn)? {
        Some(state) => {
            if is_subscription_valid(&state, now) {
                Ok(LockoutStatus {
                    locked: false,
                    reason: None,
                    grace_period_ends_at: state.grace_period_ends_at,
                })
            } else {
                let grace_end = state.grace_period_ends_at.unwrap_or(0);
                if now < grace_end {
                    // Still in grace period
                    Ok(LockoutStatus {
                        locked: false,
                        reason: None,
                        grace_period_ends_at: Some(grace_end),
                    })
                } else {
                    // Grace period expired
                    Ok(LockoutStatus {
                        locked: true,
                        reason: Some(match state.subscription_status.as_str() {
                            "past_due" => "Subscription payment past due. Please update your payment method.".to_string(),
                            "canceled" => "Subscription canceled. Data access is locked.".to_string(),
                            "expired" => "Subscription expired. Please renew to continue.".to_string(),
                            _ => "Subscription not active. Please subscribe to use Zyntopia Liidi.".to_string(),
                        }),
                        grace_period_ends_at: None,
                    })
                }
            }
        },
        None => Ok(LockoutStatus {
            locked: false,
            reason: None,
            grace_period_ends_at: None,
        }),
    }
}

/// Delete subscription state (for testing or org change)
#[allow(dead_code)] // Used for cleanup operations
pub fn delete_subscription_state(conn: &Arc<Mutex<Connection>>) -> Result<()> {
    let conn = conn.lock().unwrap();
    conn.execute("DELETE FROM subscription_state WHERE id = 1", [])?;
    Ok(())
}

/// Check if subscription is valid
fn is_subscription_valid(state: &SubscriptionState, now: i64) -> bool {
    match state.subscription_status.as_str() {
        "active" => true,
        "past_due" | "canceled" | "expired" => {
            // Check grace period
            state.grace_period_ends_at.map_or(false, |end| now < end)
        },
        _ => false,
    }
}
