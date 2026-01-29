//! Stream processor for handling stdout and stderr output uniformly
//!
//! This module provides a unified way to process, buffer, and persist
//! stream output from job processes. It handles both stdout and stderr
//! with the same treatment, including:
//! - Buffered batch inserts to the database
//! - Truncation tracking when output exceeds limits
//! - Accumulation for callback processing
//! - Event emission for real-time frontend updates

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};
use std::time::Instant;
use tokio::sync::Mutex;
use tauri::AppHandle;
use tauri::ipc::Channel;
use crate::db::BatchLogEntry;
use crate::events;

use super::StreamEvent;

/// Maximum accumulated output size (10MB)
const MAX_ACCUMULATED_OUTPUT_SIZE: usize = 10 * 1024 * 1024;

/// Number of logs to buffer before flushing to database
/// Reduced from 100 to 20 for better balance of memory vs latency
const LOG_BUFFER_FLUSH_SIZE: usize = 20;

/// Time-based flush interval (milliseconds) - flush even if buffer not full
const LOG_BUFFER_FLUSH_INTERVAL_MS: u64 = 500;

/// Statistics for a single stream (stdout or stderr)
#[derive(Debug, Clone, Default)]
pub struct StreamStats {
    pub total_bytes: usize,
    pub total_lines: usize,
    pub truncated: bool,
}

/// Buffered log entry before database insertion
#[derive(Debug, Clone)]
pub struct BufferedLogEntry {
    pub job_id: String,
    pub source: String,      // "stdout" | "stderr"
    pub log_type: String,
    pub content: String,
    pub tool_name: Option<String>,
    pub sequence: i64,
}

impl BufferedLogEntry {
    pub fn to_batch_entry(&self) -> BatchLogEntry {
        BatchLogEntry {
            job_id: self.job_id.clone(),
            log_type: self.log_type.clone(),
            content: self.content.clone(),
            tool_name: self.tool_name.clone(),
            sequence: self.sequence,
            source: self.source.clone(),
        }
    }
}

/// Context passed to completion handler after job finishes
#[derive(Debug, Clone)]
pub struct CompletionContext {
    pub job_id: String,
    pub success: bool,
    #[allow(dead_code)] // Available for future use
    pub exit_code: Option<i32>,
    #[allow(dead_code)] // Stats are persisted to DB in finalize(), kept here for debugging/logging
    pub stdout_stats: StreamStats,
    #[allow(dead_code)] // Stats are persisted to DB in finalize(), kept here for debugging/logging
    pub stderr_stats: StreamStats,
    pub accumulated_stdout: String,
    #[allow(dead_code)] // Available for callbacks that need stderr
    pub accumulated_stderr: String,
}

/// Stream processor that handles all output uniformly
pub struct StreamProcessor {
    job_id: String,
    db_conn: Arc<std::sync::Mutex<rusqlite::Connection>>,
    app_handle: AppHandle,

    // Shared buffer for all logs (stdout and stderr)
    log_buffer: Arc<Mutex<Vec<BufferedLogEntry>>>,
    sequence: Arc<AtomicI64>,

    // Accumulated output for callback
    accumulated_stdout: Arc<Mutex<String>>,
    accumulated_stderr: Arc<Mutex<String>>,

    // Stats tracking
    stdout_stats: Arc<Mutex<StreamStats>>,
    stderr_stats: Arc<Mutex<StreamStats>>,

    // Truncation flags
    stdout_truncated: Arc<AtomicBool>,
    stderr_truncated: Arc<AtomicBool>,

    // Last flush time for time-based flushing
    last_flush: Arc<Mutex<Instant>>,
}

impl StreamProcessor {
    pub fn new(
        job_id: String,
        db_conn: Arc<std::sync::Mutex<rusqlite::Connection>>,
        app_handle: AppHandle,
    ) -> Self {
        Self {
            job_id,
            db_conn,
            app_handle,
            log_buffer: Arc::new(Mutex::new(Vec::new())),
            sequence: Arc::new(AtomicI64::new(0)),
            accumulated_stdout: Arc::new(Mutex::new(String::new())),
            accumulated_stderr: Arc::new(Mutex::new(String::new())),
            stdout_stats: Arc::new(Mutex::new(StreamStats::default())),
            stderr_stats: Arc::new(Mutex::new(StreamStats::default())),
            stdout_truncated: Arc::new(AtomicBool::new(false)),
            stderr_truncated: Arc::new(AtomicBool::new(false)),
            last_flush: Arc::new(Mutex::new(Instant::now())),
        }
    }

    /// Flush the log buffer to staging table
    async fn flush_buffer(&self) {
        let logs_to_insert: Vec<BufferedLogEntry> = {
            let mut buffer = self.log_buffer.lock().await;
            if buffer.is_empty() {
                return;
            }
            buffer.drain(..).collect()
        };

        if logs_to_insert.is_empty() {
            return;
        }

        let batch_entries: Vec<BatchLogEntry> = logs_to_insert
            .iter()
            .map(|e| e.to_batch_entry())
            .collect();

        let last_seq = logs_to_insert.last().map(|l| l.sequence).unwrap_or(0);
        let count = logs_to_insert.len() as i64;

        // Insert to staging table (no FK constraint, no retry needed)
        let insert_result = match self.db_conn.lock() {
            Ok(conn) => crate::db::insert_job_logs_to_staging(&conn, &batch_entries),
            Err(_) => {
                eprintln!("[stream_processor] job_id={} Failed to acquire DB lock", self.job_id);
                // Note: logs remain in buffer and will be retried on next flush
                // Emit event for frontend (even if insert failed, stream is progressing)
                events::emit_job_logs_appended(&self.app_handle, self.job_id.clone(), count, last_seq);
                return;
            }
        };

        match insert_result {
            Ok(inserted) => {
                if inserted != batch_entries.len() {
                    eprintln!(
                        "[stream_processor] job_id={} Warning: inserted {} logs but expected {}",
                        self.job_id, inserted, batch_entries.len()
                    );
                }
                // Update last flush time on success (outside DB lock scope to avoid Send issues)
                *self.last_flush.lock().await = Instant::now();
            }
            Err(e) => {
                eprintln!(
                    "[stream_processor] job_id={} Failed to insert logs to staging: {}",
                    self.job_id, e
                );
                // Note: logs remain in buffer and will be retried on next flush
            }
        }

        // Emit event for frontend (even if insert failed, stream is progressing)
        events::emit_job_logs_appended(&self.app_handle, self.job_id.clone(), count, last_seq);
    }

    /// Finalize streams and return completion context
    pub async fn finalize(
        &self,
        success: bool,
        exit_code: Option<i32>,
    ) -> CompletionContext {
        // Flush any remaining logs to staging
        self.flush_buffer().await;

        // Promote staged logs to main table
        match self.db_conn.lock() {
            Ok(conn) => {
                match crate::db::promote_staged_logs(&conn, &self.job_id) {
                    Ok(promoted_count) => {
                        if promoted_count > 0 {
                            eprintln!(
                                "[stream_processor] job_id={} Promoted {} staged logs to main table",
                                self.job_id, promoted_count
                            );
                        }
                    }
                    Err(e) => {
                        eprintln!(
                            "[stream_processor] job_id={} Failed to promote staged logs: {} (logs remain in staging for later cleanup)",
                            self.job_id, e
                        );
                    }
                }
            }
            Err(_) => {
                eprintln!("[stream_processor] job_id={} Failed to acquire DB lock for promotion", self.job_id);
            }
        }

        // Update stream stats in database
        let stdout_stats = self.stdout_stats.lock().await.clone();
        let stderr_stats = self.stderr_stats.lock().await.clone();

        if let Ok(conn) = self.db_conn.lock() {
            let _ = crate::db::update_job_stream_stats(
                &conn,
                &self.job_id,
                stdout_stats.truncated,
                stderr_stats.truncated,
                stdout_stats.total_bytes as i64,
                stderr_stats.total_bytes as i64,
            );
        }

        // Build completion context
        CompletionContext {
            job_id: self.job_id.clone(),
            success,
            exit_code,
            stdout_stats,
            stderr_stats,
            accumulated_stdout: self.accumulated_stdout.lock().await.clone(),
            accumulated_stderr: self.accumulated_stderr.lock().await.clone(),
        }
    }

    /// Create a clone for use in a separate task
    pub fn clone_for_task(&self) -> StreamProcessorHandle {
        StreamProcessorHandle {
            job_id: self.job_id.clone(),
            db_conn: self.db_conn.clone(),
            app_handle: self.app_handle.clone(),
            log_buffer: self.log_buffer.clone(),
            sequence: self.sequence.clone(),
            accumulated_stdout: self.accumulated_stdout.clone(),
            accumulated_stderr: self.accumulated_stderr.clone(),
            stdout_stats: self.stdout_stats.clone(),
            stderr_stats: self.stderr_stats.clone(),
            stdout_truncated: self.stdout_truncated.clone(),
            stderr_truncated: self.stderr_truncated.clone(),
            last_flush: self.last_flush.clone(),
        }
    }
}

/// Handle for use in spawned tasks (Send + Sync safe)
pub struct StreamProcessorHandle {
    job_id: String,
    db_conn: Arc<std::sync::Mutex<rusqlite::Connection>>,
    app_handle: AppHandle,
    log_buffer: Arc<Mutex<Vec<BufferedLogEntry>>>,
    sequence: Arc<AtomicI64>,
    accumulated_stdout: Arc<Mutex<String>>,
    accumulated_stderr: Arc<Mutex<String>>,
    stdout_stats: Arc<Mutex<StreamStats>>,
    stderr_stats: Arc<Mutex<StreamStats>>,
    stdout_truncated: Arc<AtomicBool>,
    stderr_truncated: Arc<AtomicBool>,
    last_flush: Arc<Mutex<Instant>>,
}

impl StreamProcessorHandle {
    pub async fn process_stdout_line(&self, line: String, on_event: &Channel<StreamEvent>) {
        self.process_line(line, "stdout", on_event).await;
    }

    pub async fn process_stderr_line(&self, line: String, on_event: &Channel<StreamEvent>) {
        self.process_line(line, "stderr", on_event).await;
    }

    async fn process_line(&self, line: String, source: &str, on_event: &Channel<StreamEvent>) {
        let line_len = line.len();

        let (accumulated, truncated_flag, stats) = if source == "stdout" {
            (&self.accumulated_stdout, &self.stdout_truncated, &self.stdout_stats)
        } else {
            (&self.accumulated_stderr, &self.stderr_truncated, &self.stderr_stats)
        };

        // Update stats
        {
            let mut stats = stats.lock().await;
            stats.total_bytes += line_len + 1;
            stats.total_lines += 1;
        }

        // Accumulate output with bounded buffer
        {
            let mut acc = accumulated.lock().await;
            if acc.len() < MAX_ACCUMULATED_OUTPUT_SIZE {
                acc.push_str(&line);
                acc.push('\n');
            } else if !truncated_flag.load(Ordering::Relaxed) {
                truncated_flag.store(true, Ordering::Relaxed);
                let mut stats = stats.lock().await;
                stats.truncated = true;
                eprintln!(
                    "[stream_processor] job_id={} {} buffer exceeded {}MB limit, truncating",
                    self.job_id,
                    source,
                    MAX_ACCUMULATED_OUTPUT_SIZE / 1024 / 1024
                );
            }
        }

        // Parse log type and tool name
        let (log_type, tool_name) = if source == "stdout" {
            parse_stream_json_type(&line)
        } else {
            ("stderr".to_string(), None)
        };

        // Check for Claude session info
        if source == "stdout" {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                if json.get("type").and_then(|t| t.as_str()) == Some("system")
                    && json.get("subtype").and_then(|t| t.as_str()) == Some("init")
                {
                    let session_id = json.get("session_id").and_then(|s| s.as_str()).unwrap_or("");
                    let model = json.get("model").and_then(|s| s.as_str()).unwrap_or("");
                    if !session_id.is_empty() {
                        // Acquire db_conn first (consistent lock ordering)
                        if let Ok(conn) = self.db_conn.lock() {
                            let _ = crate::db::update_job_claude_session(&conn, &self.job_id, session_id, model);
                        }
                    }
                }
            }
        }

        let seq = self.sequence.fetch_add(1, Ordering::SeqCst);

        let entry = BufferedLogEntry {
            job_id: self.job_id.clone(),
            source: source.to_string(),
            log_type: log_type.clone(),
            content: line.clone(),
            tool_name: tool_name.clone(),
            sequence: seq,
        };

        // Check both size AND time thresholds for flushing
        let should_flush = {
            let mut buffer = self.log_buffer.lock().await;
            buffer.push(entry);

            let size_threshold = buffer.len() >= LOG_BUFFER_FLUSH_SIZE;
            let time_threshold = self.last_flush.lock().await.elapsed()
                >= std::time::Duration::from_millis(LOG_BUFFER_FLUSH_INTERVAL_MS);

            size_threshold || time_threshold
        };

        if should_flush {
            self.flush_buffer().await;
        }

        if let Err(e) = on_event.send(StreamEvent {
            job_id: self.job_id.clone(),
            event_type: source.to_string(),
            content: line,
            timestamp: chrono::Utc::now().timestamp_millis(),
        }) {
            eprintln!(
                "[stream_processor] job_id={} Failed to send {} event: {}",
                self.job_id, source, e
            );
        }
    }

    pub async fn flush_buffer(&self) {
        let logs_to_insert: Vec<BufferedLogEntry> = {
            let mut buffer = self.log_buffer.lock().await;
            if buffer.is_empty() {
                return;
            }
            buffer.drain(..).collect()
        };

        if logs_to_insert.is_empty() {
            return;
        }

        let batch_entries: Vec<BatchLogEntry> = logs_to_insert
            .iter()
            .map(|e| e.to_batch_entry())
            .collect();

        let last_seq = logs_to_insert.last().map(|l| l.sequence).unwrap_or(0);
        let count = logs_to_insert.len() as i64;

        // Insert to staging table (no FK constraint, no retry needed)
        let insert_result = match self.db_conn.lock() {
            Ok(conn) => crate::db::insert_job_logs_to_staging(&conn, &batch_entries),
            Err(_) => {
                eprintln!("[stream_processor] job_id={} Failed to acquire DB lock", self.job_id);
                // Note: logs remain in buffer and will be retried on next flush
                // Emit event for frontend (even if insert failed, stream is progressing)
                events::emit_job_logs_appended(&self.app_handle, self.job_id.clone(), count, last_seq);
                return;
            }
        };

        match insert_result {
            Ok(inserted) => {
                if inserted != batch_entries.len() {
                    eprintln!(
                        "[stream_processor] job_id={} Warning: inserted {} logs but expected {}",
                        self.job_id, inserted, batch_entries.len()
                    );
                }
                // Update last flush time on success (outside DB lock scope to avoid Send issues)
                *self.last_flush.lock().await = Instant::now();
            }
            Err(e) => {
                eprintln!(
                    "[stream_processor] job_id={} Failed to insert logs to staging: {}",
                    self.job_id, e
                );
                // Note: logs remain in buffer and will be retried on next flush
            }
        }

        // Emit event for frontend (even if insert failed, stream is progressing)
        events::emit_job_logs_appended(&self.app_handle, self.job_id.clone(), count, last_seq);
    }
}

/// Parse the log type and tool name from a Claude stream-json line
fn parse_stream_json_type(line: &str) -> (String, Option<String>) {
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
        let event_type = json.get("type").and_then(|t| t.as_str()).unwrap_or("unknown");

        let log_type = match event_type {
            "system" => "system",
            "assistant" => "assistant",
            "user" => "tool_result",
            "result" => {
                if json.get("is_error").and_then(|e| e.as_bool()).unwrap_or(false) {
                    "error"
                } else {
                    "info"
                }
            }
            "error" => "error",
            "content_block_start" | "content_block_delta" => "assistant",
            _ => "info",
        };

        // Extract tool name for tool_use events
        let tool_name = if event_type == "assistant" {
            json.get("message")
                .and_then(|m| m.get("content"))
                .and_then(|c| c.as_array())
                .and_then(|arr| {
                    arr.iter()
                        .find(|block| block.get("type").and_then(|t| t.as_str()) == Some("tool_use"))
                        .and_then(|block| block.get("name").and_then(|n| n.as_str()))
                        .map(String::from)
                })
        } else if event_type == "content_block_start" {
            json.get("content_block")
                .and_then(|cb| cb.get("name"))
                .and_then(|n| n.as_str())
                .map(String::from)
        } else {
            None
        };

        (log_type.to_string(), tool_name)
    } else {
        ("info".to_string(), None)
    }
}
