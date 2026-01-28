use crate::subscription::store::{should_renew_token, update_token};
use std::sync::Arc;
use std::time::Duration;
use tokio::time::interval;
use log::info;

/// Background task that periodically renews the subscription token
/// This should be spawned as a tokio task on app startup
pub async fn start_renewal_task(
    conn: Arc<Mutex<rusqlite::Connection>>,
    renewal_fn: impl Fn() -> Result<(String, String, Option<i64>), String> + Send + Sync + 'static,
) {
    let mut interval = interval(Duration::from_secs(3600)); // Check every hour

    loop {
        interval.tick().await;

        // Check if renewal is needed
        let needs_renewal = match should_renew_token(&conn) {
            Ok(needs) => needs,
            Err(e) => {
                eprintln!("Failed to check token renewal status: {}", e);
                continue;
            }
        };

        if !needs_renewal {
            continue;
        }

        info!("Token is older than 23 hours, attempting renewal...");

        // Attempt to renew via the provided function
        match renewal_fn() {
            Ok((new_token, status, expires_at)) => {
                if let Err(e) = update_token(&conn, &new_token, &status, expires_at) {
                    eprintln!("Failed to update renewed token: {}", e);
                } else {
                    info!("Token renewed successfully");
                }
            }
            Err(e) => {
                eprintln!("Token renewal failed: {}", e);
            }
        }
    }
}

/// Type alias for renewal function that returns (token, status, expires_at)
pub type RenewalFn = dyn Fn() -> Result<(String, String, Option<i64>), String> + Send + Sync;
use std::sync::Mutex;
