//! Recovery mechanisms for stale and stuck jobs.
//!
//! This module provides functions to detect and recover from jobs that were
//! interrupted (e.g., app crash, system restart) and left in an inconsistent state.

use std::sync::{Arc, Mutex};
use rusqlite::{Connection, params};
use tauri::AppHandle;
use crate::events;

/// Maximum age (in seconds) for a job to be considered "running" before it's stale.
/// Jobs older than this are assumed to have died without proper cleanup.
const STALE_JOB_THRESHOLD_SECS: i64 = 600; // 10 minutes

/// Result of stale job detection
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StaleJobsResult {
    pub stale_jobs: Vec<StaleJob>,
    pub stuck_leads: Vec<StuckEntity>,
    pub stuck_people: Vec<StuckEntity>,
}

/// A job that appears to be stale (running too long without completion)
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StaleJob {
    pub id: String,
    pub job_type: String,
    pub entity_id: i64,
    pub entity_label: String,
    pub status: String,
    pub started_at: Option<i64>,
    pub created_at: i64,
}

/// An entity stuck in "in_progress" status without an active job
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StuckEntity {
    pub id: i64,
    pub name: String,
    pub entity_type: String, // "lead" or "person"
    pub status: String,
}

/// Detect stale jobs - jobs with "running" or "queued" status that are too old
pub fn detect_stale_jobs(conn: &Connection) -> Result<Vec<StaleJob>, String> {
    let now = chrono::Utc::now().timestamp();
    let threshold = now - STALE_JOB_THRESHOLD_SECS;

    let mut stmt = conn.prepare(
        "SELECT id, job_type, entity_id, entity_label, status, started_at, created_at
         FROM jobs
         WHERE status IN ('queued', 'running')
           AND created_at < ?1
         ORDER BY created_at ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![threshold], |row| {
        Ok(StaleJob {
            id: row.get(0)?,
            job_type: row.get(1)?,
            entity_id: row.get(2)?,
            entity_label: row.get(3)?,
            status: row.get(4)?,
            started_at: row.get(5)?,
            created_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// Detect leads stuck in "in_progress" status without an active job
pub fn detect_stuck_leads(conn: &Connection) -> Result<Vec<StuckEntity>, String> {
    let mut stmt = conn.prepare(
        "SELECT l.id, l.company_name
         FROM leads l
         WHERE l.research_status = 'in_progress'
           AND NOT EXISTS (
             SELECT 1 FROM jobs j
             WHERE j.entity_id = l.id
               AND j.job_type = 'company_research'
               AND j.status IN ('queued', 'running')
           )"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(StuckEntity {
            id: row.get(0)?,
            name: row.get(1)?,
            entity_type: "lead".to_string(),
            status: "in_progress".to_string(),
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// Detect people stuck in "in_progress" status without an active job
pub fn detect_stuck_people(conn: &Connection) -> Result<Vec<StuckEntity>, String> {
    let mut stmt = conn.prepare(
        "SELECT p.id, p.first_name || ' ' || p.last_name as name
         FROM people p
         WHERE p.research_status = 'in_progress'
           AND NOT EXISTS (
             SELECT 1 FROM jobs j
             WHERE j.entity_id = p.id
               AND j.job_type = 'person_research'
               AND j.status IN ('queued', 'running')
           )"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(StuckEntity {
            id: row.get(0)?,
            name: row.get(1)?,
            entity_type: "person".to_string(),
            status: "in_progress".to_string(),
        })
    }).map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// Recover stale jobs - mark them as error and reset associated entity status
pub fn recover_stale_jobs(
    conn: &Connection,
    app: &AppHandle,
) -> Result<usize, String> {
    let stale_jobs = detect_stale_jobs(conn)?;
    let now = chrono::Utc::now().timestamp();
    let mut recovered = 0;

    for job in &stale_jobs {
        // Mark job as error
        conn.execute(
            "UPDATE jobs SET status = 'error', error_message = 'Recovered stale job', completed_at = ?1 WHERE id = ?2",
            params![now, job.id],
        ).map_err(|e| e.to_string())?;

        // Reset entity status based on job type
        match job.job_type.as_str() {
            "company_research" => {
                conn.execute(
                    "UPDATE leads SET research_status = 'pending' WHERE id = ?1 AND research_status = 'in_progress'",
                    params![job.entity_id],
                ).map_err(|e| e.to_string())?;
                events::emit_lead_updated(app, job.entity_id);
            }
            "person_research" => {
                conn.execute(
                    "UPDATE people SET research_status = 'pending' WHERE id = ?1 AND research_status = 'in_progress'",
                    params![job.entity_id],
                ).map_err(|e| e.to_string())?;
                // Get lead_id for event
                if let Ok(lead_id) = conn.query_row(
                    "SELECT lead_id FROM people WHERE id = ?1",
                    params![job.entity_id],
                    |row| row.get::<_, i64>(0),
                ) {
                    events::emit_person_updated(app, job.entity_id, lead_id);
                }
            }
            _ => {
                // Scoring and conversation jobs don't have a research_status to reset
            }
        }

        recovered += 1;
        eprintln!("[recovery] Recovered stale job {} (type: {}, entity: {})", job.id, job.job_type, job.entity_id);
    }

    Ok(recovered)
}

/// Recover stuck entities - entities with "in_progress" status but no active job
pub fn recover_stuck_entities(
    conn: &Connection,
    app: &AppHandle,
) -> Result<usize, String> {
    let stuck_leads = detect_stuck_leads(conn)?;
    let stuck_people = detect_stuck_people(conn)?;
    let mut recovered = 0;

    for lead in &stuck_leads {
        conn.execute(
            "UPDATE leads SET research_status = 'pending' WHERE id = ?1",
            params![lead.id],
        ).map_err(|e| e.to_string())?;
        events::emit_lead_updated(app, lead.id);
        recovered += 1;
        eprintln!("[recovery] Recovered stuck lead {} ({})", lead.id, lead.name);
    }

    for person in &stuck_people {
        conn.execute(
            "UPDATE people SET research_status = 'pending' WHERE id = ?1",
            params![person.id],
        ).map_err(|e| e.to_string())?;
        // Get lead_id for event
        if let Ok(lead_id) = conn.query_row(
            "SELECT lead_id FROM people WHERE id = ?1",
            params![person.id],
            |row| row.get::<_, i64>(0),
        ) {
            events::emit_person_updated(app, person.id, lead_id);
        }
        recovered += 1;
        eprintln!("[recovery] Recovered stuck person {} ({})", person.id, person.name);
    }

    Ok(recovered)
}

/// Run all recovery operations on startup
pub fn recover_on_startup(
    conn: &Arc<Mutex<Connection>>,
    app: &AppHandle,
) {
    eprintln!("[recovery] Running startup recovery...");

    let conn_guard = match conn.lock() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[recovery] Failed to lock database: {}", e);
            return;
        }
    };

    // Recover stale jobs
    match recover_stale_jobs(&conn_guard, app) {
        Ok(count) if count > 0 => eprintln!("[recovery] Recovered {} stale jobs", count),
        Err(e) => eprintln!("[recovery] Failed to recover stale jobs: {}", e),
        _ => {}
    }

    // Recover stuck entities
    match recover_stuck_entities(&conn_guard, app) {
        Ok(count) if count > 0 => eprintln!("[recovery] Recovered {} stuck entities", count),
        Err(e) => eprintln!("[recovery] Failed to recover stuck entities: {}", e),
        _ => {}
    }

    eprintln!("[recovery] Startup recovery complete");
}
