pub mod schema;
pub mod queries;

use rusqlite::{Connection, Result as SqliteResult};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

pub use schema::*;
pub use queries::*;

/// Database state managed by Tauri
/// Uses Arc<Mutex<Connection>> for safe sharing across async tasks
pub struct DbState {
    pub conn: Arc<Mutex<Connection>>,
}

impl DbState {
    pub fn new(db_path: PathBuf) -> SqliteResult<Self> {
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(&db_path)?;

        // Enable WAL mode for better concurrency
        conn.pragma_update(None, "journal_mode", "WAL")?;

        // Initialize schema
        init_schema(&conn)?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }
}

/// Initialize the database schema
fn init_schema(conn: &Connection) -> SqliteResult<()> {
    // Create tables first
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            website TEXT,
            industry TEXT,
            sub_industry TEXT,
            employees INTEGER,
            employee_range TEXT,
            revenue REAL,
            revenue_range TEXT,
            company_linkedin_url TEXT,
            city TEXT,
            state TEXT,
            country TEXT,
            research_status TEXT DEFAULT 'pending',
            researched_at INTEGER,
            user_status TEXT DEFAULT 'new',
            created_at INTEGER NOT NULL,
            company_profile TEXT
        );

        CREATE TABLE IF NOT EXISTS people (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT,
            title TEXT,
            management_level TEXT,
            linkedin_url TEXT,
            year_joined INTEGER,
            person_profile TEXT,
            research_status TEXT DEFAULT 'pending',
            researched_at INTEGER,
            user_status TEXT DEFAULT 'new',
            conversation_topics TEXT,
            conversation_generated_at INTEGER,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS prompts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL DEFAULT 'company',
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS scoring_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT 'default',
            is_active INTEGER NOT NULL DEFAULT 1,
            required_characteristics TEXT NOT NULL,
            demand_signifiers TEXT NOT NULL,
            tier_hot_min INTEGER NOT NULL DEFAULT 80,
            tier_warm_min INTEGER NOT NULL DEFAULT 50,
            tier_nurture_min INTEGER NOT NULL DEFAULT 30,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lead_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
            config_id INTEGER NOT NULL REFERENCES scoring_config(id),
            passes_requirements INTEGER NOT NULL,
            requirement_results TEXT NOT NULL,
            total_score INTEGER NOT NULL,
            score_breakdown TEXT NOT NULL,
            tier TEXT NOT NULL,
            scoring_notes TEXT,
            scored_at INTEGER,
            created_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_people_lead_id ON people(lead_id);
        CREATE INDEX IF NOT EXISTS idx_lead_scores_lead_id ON lead_scores(lead_id);
        CREATE INDEX IF NOT EXISTS idx_prompts_type ON prompts(type);

        -- Jobs table for persisting streaming job state
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            job_type TEXT NOT NULL,
            entity_id INTEGER NOT NULL,
            entity_label TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'queued',
            prompt TEXT NOT NULL,
            model TEXT,
            working_dir TEXT NOT NULL,
            output_path TEXT,
            exit_code INTEGER,
            error_message TEXT,
            created_at INTEGER NOT NULL,
            started_at INTEGER,
            completed_at INTEGER,
            pid INTEGER,
            claude_session_id TEXT,
            claude_model TEXT,
            last_event_index INTEGER DEFAULT 0
        );

        -- Job logs table for persisting stream output
        CREATE TABLE IF NOT EXISTS job_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
            log_type TEXT NOT NULL,
            content TEXT NOT NULL,
            tool_name TEXT,
            timestamp INTEGER NOT NULL,
            sequence INTEGER NOT NULL,
            source TEXT NOT NULL DEFAULT 'stdout'
        );

        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs(job_id);
        CREATE INDEX IF NOT EXISTS idx_job_logs_sequence ON job_logs(job_id, sequence);

        -- App settings table (single row)
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            model TEXT NOT NULL DEFAULT 'sonnet',
            use_chrome INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL
        );

        -- Insert default settings if not exists
        INSERT OR IGNORE INTO settings (id, model, use_chrome, updated_at)
        VALUES (1, 'sonnet', 0, strftime('%s', 'now') * 1000);

        "#,
    )?;

    // Run migrations for new columns
    run_migrations(conn)?;

    Ok(())
}

/// Run database migrations for new columns
fn run_migrations(conn: &Connection) -> SqliteResult<()> {
    // Helper to check if a column exists
    fn column_exists(conn: &Connection, table: &str, column: &str) -> bool {
        let query = format!("PRAGMA table_info({})", table);
        if let Ok(mut stmt) = conn.prepare(&query) {
            if let Ok(rows) = stmt.query_map([], |row| {
                row.get::<_, String>(1) // column name is at index 1
            }) {
                for name in rows.flatten() {
                    if name == column {
                        return true;
                    }
                }
            }
        }
        false
    }

    // Migration: Add source column to job_logs
    if !column_exists(conn, "job_logs", "source") {
        conn.execute(
            "ALTER TABLE job_logs ADD COLUMN source TEXT NOT NULL DEFAULT 'stdout'",
            [],
        )?;
    }

    // Migration: Add stream statistics columns to jobs
    if !column_exists(conn, "jobs", "stdout_truncated") {
        conn.execute(
            "ALTER TABLE jobs ADD COLUMN stdout_truncated INTEGER DEFAULT 0",
            [],
        )?;
    }
    if !column_exists(conn, "jobs", "stderr_truncated") {
        conn.execute(
            "ALTER TABLE jobs ADD COLUMN stderr_truncated INTEGER DEFAULT 0",
            [],
        )?;
    }
    if !column_exists(conn, "jobs", "total_stdout_bytes") {
        conn.execute(
            "ALTER TABLE jobs ADD COLUMN total_stdout_bytes INTEGER DEFAULT 0",
            [],
        )?;
    }
    if !column_exists(conn, "jobs", "total_stderr_bytes") {
        conn.execute(
            "ALTER TABLE jobs ADD COLUMN total_stderr_bytes INTEGER DEFAULT 0",
            [],
        )?;
    }
    if !column_exists(conn, "jobs", "completion_state") {
        conn.execute(
            "ALTER TABLE jobs ADD COLUMN completion_state TEXT DEFAULT NULL",
            [],
        )?;
    }

    Ok(())
}

/// Get the default database path
pub fn get_db_path() -> PathBuf {
    let data_dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("qual");

    data_dir.join("data.db")
}
