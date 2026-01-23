use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
pub struct LeadUpdatedPayload {
    pub id: i64,
}

#[derive(Clone, Serialize)]
pub struct PersonUpdatedPayload {
    pub id: i64,
    pub lead_id: i64,
}

#[derive(Clone, Serialize)]
pub struct LeadScoredPayload {
    pub lead_id: i64,
}

#[derive(Clone, Serialize)]
pub struct PeopleBulkCreatedPayload {
    pub lead_id: i64,
}

#[derive(Clone, Serialize)]
pub struct LeadCreatedPayload {
    pub id: i64,
}

#[derive(Clone, Serialize)]
pub struct LeadDeletedPayload {
    pub ids: Vec<i64>,
}

#[derive(Clone, Serialize)]
pub struct PersonDeletedPayload {
    pub ids: Vec<i64>,
}

pub fn emit_lead_updated(app: &AppHandle, id: i64) {
    let _ = app.emit("lead-updated", LeadUpdatedPayload { id });
}

pub fn emit_person_updated(app: &AppHandle, id: i64, lead_id: i64) {
    let _ = app.emit("person-updated", PersonUpdatedPayload { id, lead_id });
}

pub fn emit_lead_scored(app: &AppHandle, lead_id: i64) {
    let _ = app.emit("lead-scored", LeadScoredPayload { lead_id });
}

pub fn emit_people_bulk_created(app: &AppHandle, lead_id: i64) {
    let _ = app.emit("people-bulk-created", PeopleBulkCreatedPayload { lead_id });
}

pub fn emit_lead_created(app: &AppHandle, id: i64) {
    let _ = app.emit("lead-created", LeadCreatedPayload { id });
}

pub fn emit_lead_deleted(app: &AppHandle, ids: Vec<i64>) {
    let _ = app.emit("lead-deleted", LeadDeletedPayload { ids });
}

pub fn emit_person_deleted(app: &AppHandle, ids: Vec<i64>) {
    let _ = app.emit("person-deleted", PersonDeletedPayload { ids });
}

// ============================================================================
// Job Events
// ============================================================================

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JobStatusChangedPayload {
    pub job_id: String,
    pub status: String,
    pub exit_code: Option<i32>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JobLogsAppendedPayload {
    pub job_id: String,
    pub count: i64,
    pub last_sequence: i64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JobCreatedPayload {
    pub job_id: String,
    pub job_type: String,
    pub entity_id: i64,
    pub entity_label: String,
}

pub fn emit_job_status_changed(app: &AppHandle, job_id: String, status: String, exit_code: Option<i32>) {
    let _ = app.emit("job-status-changed", JobStatusChangedPayload { job_id, status, exit_code });
}

pub fn emit_job_logs_appended(app: &AppHandle, job_id: String, count: i64, last_sequence: i64) {
    let _ = app.emit("job-logs-appended", JobLogsAppendedPayload { job_id, count, last_sequence });
}

pub fn emit_job_created(app: &AppHandle, job_id: String, job_type: String, entity_id: i64, entity_label: String) {
    let _ = app.emit("job-created", JobCreatedPayload { job_id, job_type, entity_id, entity_label });
}
