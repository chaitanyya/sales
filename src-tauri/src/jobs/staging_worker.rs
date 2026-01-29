use std::sync::Arc;
use tauri::AppHandle;
use tokio::time::{Duration, interval};

// ============================================================================
// Constants
// ============================================================================

/// Interval between promotion cycles (5 seconds)
const PROMOTION_INTERVAL_MS: u64 = 5000;

/// Interval between cleanup cycles (1 hour)
const CLEANUP_INTERVAL_MS: u64 = 3600000;

/// How long to keep orphaned staged logs before cleanup (24 hours)
const STAGING_RETENTION_MS: i64 = 86400000;

// ============================================================================
// StagingWorker
// ============================================================================

/// Background worker for promoting staged logs and periodic cleanup
///
/// This worker runs in the background and:
/// 1. Promotes staged logs to the main table every 5 seconds
/// 2. Cleans up orphaned and marked records every hour
/// 3. Recovers existing staged logs on startup
pub struct StagingWorker {
    db_conn: Arc<std::sync::Mutex<rusqlite::Connection>>,
    app_handle: AppHandle,
    running: Arc<tokio::sync::Mutex<bool>>,
}

impl StagingWorker {
    /// Create a new StagingWorker instance
    pub fn new(
        db_conn: Arc<std::sync::Mutex<rusqlite::Connection>>,
        app_handle: AppHandle,
    ) -> Self {
        Self {
            db_conn,
            app_handle,
            running: Arc::new(tokio::sync::Mutex::new(false)),
        }
    }

    /// Start the background worker
    ///
    /// Spawns a tokio task that:
    /// - Promotes staged logs every 5 seconds
    /// - Cleans up old orphaned records every hour
    /// - Stops when running flag is set to false
    pub fn start(&self) {
        let db_conn = self.db_conn.clone();
        let running = self.running.clone();

        // Set running flag to true
        let rt = tokio::runtime::Handle::try_current();
        if let Ok(handle) = rt {
            handle.spawn(async move {
                *running.lock().await = true;

                // Create promotion ticker (every 5 seconds)
                let mut promotion_ticker = interval(Duration::from_millis(PROMOTION_INTERVAL_MS));

                // Create cleanup ticker (every hour)
                let mut cleanup_ticker = interval(Duration::from_millis(CLEANUP_INTERVAL_MS));

                // Tick immediately to avoid waiting for first interval
                promotion_ticker.tick().await;
                cleanup_ticker.tick().await;

                loop {
                    // Check if we should stop
                    let is_running = *running.lock().await;
                    if !is_running {
                        eprintln!("[staging_worker] Worker stopping");
                        break;
                    }

                    // Use tokio::select! to handle both tickers
                    tokio::select! {
                        _ = promotion_ticker.tick() => {
                            // Promote staged logs
                            if let Ok(conn) = db_conn.lock() {
                                match crate::db::promote_all_staged_logs(&conn) {
                                    Ok(promoted_jobs) => {
                                        if !promoted_jobs.is_empty() {
                                            eprintln!("[staging_worker] Promoted logs for {} jobs", promoted_jobs.len());
                                        }
                                    }
                                    Err(e) => {
                                        eprintln!("[staging_worker] Error promoting staged logs: {}", e);
                                    }
                                }
                            }
                        }
                        _ = cleanup_ticker.tick() => {
                            // Cleanup old orphaned records
                            if let Ok(conn) = db_conn.lock() {
                                match crate::db::cleanup_staging_table(&conn, STAGING_RETENTION_MS) {
                                    Ok(stats) => {
                                        if stats.total > 0 {
                                            eprintln!("[staging_worker] Cleanup: deleted {} total records ({} marked, {} old)",
                                                stats.total, stats.marked_deleted, stats.old_records);
                                        }
                                    }
                                    Err(e) => {
                                        eprintln!("[staging_worker] Error cleaning up staging table: {}", e);
                                    }
                                }
                            }
                        }
                    }

                    // Small sleep to prevent busy loop if both tickers fire simultaneously
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }

                eprintln!("[staging_worker] Worker stopped");
            });
        } else {
            eprintln!("[staging_worker] ERROR: No tokio runtime available, cannot start worker");
        }
    }

    /// Stop the background worker
    pub async fn stop(&self) {
        *self.running.lock().await = false;
        eprintln!("[staging_worker] Stop signal sent");
    }

    /// Perform startup recovery - promote any existing staged logs
    ///
    /// This should be called when the application starts to ensure
    /// any logs left in the staging table from a previous session
    /// are promoted to the main table.
    pub fn startup_recovery(&self) {
        let db_conn = self.db_conn.clone();
        let app_handle = self.app_handle.clone();

        // Run recovery in a blocking task to ensure it completes before startup continues
        let rt = tokio::runtime::Handle::try_current();
        if let Ok(handle) = rt {
            handle.spawn(async move {
                eprintln!("[staging_worker] Performing startup recovery...");

                if let Ok(conn) = db_conn.lock() {
                    match crate::db::promote_all_staged_logs(&conn) {
                        Ok(promoted_jobs) => {
                            if !promoted_jobs.is_empty() {
                                eprintln!("[staging_worker] Startup recovery: promoted logs for {} jobs", promoted_jobs.len());
                                // Emit events for each job to refresh frontend state
                                for job_id in &promoted_jobs {
                                    // Fetch job details to emit proper events
                                    if let Ok(Some(job)) = crate::db::get_job(&conn, job_id) {
                                        // Emit job status changed event to notify frontend
                                        crate::events::emit_job_status_changed(
                                            &app_handle,
                                            job_id.clone(),
                                            job.status,
                                            job.exit_code,
                                        );
                                    }
                                }
                            } else {
                                eprintln!("[staging_worker] Startup recovery: no staged logs to promote");
                            }
                        }
                        Err(e) => {
                            eprintln!("[staging_worker] Startup recovery error: {}", e);
                        }
                    }
                }
            });
        } else {
            eprintln!("[staging_worker] ERROR: No tokio runtime available, cannot perform startup recovery");
        }
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_constants() {
        assert_eq!(PROMOTION_INTERVAL_MS, 5000);
        assert_eq!(CLEANUP_INTERVAL_MS, 3600000);
        assert_eq!(STAGING_RETENTION_MS, 86400000);
    }
}
