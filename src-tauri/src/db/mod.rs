pub mod schema;
pub mod queries;
pub mod seed;

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

        // Seed default data (idempotent)
        seed::seed_defaults(&conn)?;

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
            lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
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
            last_event_index INTEGER DEFAULT 0,
            stdout_truncated INTEGER DEFAULT 0,
            stderr_truncated INTEGER DEFAULT 0,
            total_stdout_bytes INTEGER DEFAULT 0,
            total_stderr_bytes INTEGER DEFAULT 0,
            completion_state TEXT DEFAULT NULL
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
            use_glm_gateway INTEGER NOT NULL DEFAULT 1,
            updated_at INTEGER NOT NULL
        );

        -- Insert default settings if not exists
        INSERT OR IGNORE INTO settings (id, model, use_chrome, updated_at)
        VALUES (1, 'sonnet', 0, strftime('%s', 'now') * 1000);

        "#,
    )?;

    // Initialize subscription table
    crate::subscription::init_subscription_table(conn)?;

    // Initialize org binding tables (single-tenant)
    crate::org_store::init_org_tables(conn)?;

    // Run migrations for new columns
    run_migrations(conn)?;

    Ok(())
}

/// Helper to check if a column has NOT NULL constraint
fn column_has_notnull(conn: &Connection, table: &str, column: &str) -> bool {
    let query = format!("PRAGMA table_info({})", table);
    if let Ok(mut stmt) = conn.prepare(&query) {
        if let Ok(rows) = stmt.query_map([], |row| -> Result<(String, i64), rusqlite::Error> {
            Ok((
                row.get::<_, String>(1)?, // column name at index 1
                row.get::<_, i64>(3)?,    // notnull flag at index 3
            ))
        }) {
            for result in rows.flatten() {
                if result.0 == column {
                    return result.1 != 0;
                }
            }
        }
    }
    false
}

/// Helper to check if a column exists
fn column_exists(conn: &Connection, table: &str, column: &str) -> bool {
    let query = format!("PRAGMA table_info({})", table);
    if let Ok(mut stmt) = conn.prepare(&query) {
        if let Ok(rows) = stmt.query_map([], |row| -> Result<String, rusqlite::Error> {
            Ok(row.get::<_, String>(1)?)
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

/// Run database migrations for new columns
fn run_migrations(conn: &Connection) -> SqliteResult<()> {
    // Migration: Add use_glm_gateway to settings if not exists
    if !column_exists(conn, "settings", "use_glm_gateway") {
        eprintln!("[db] Migrating settings table to add use_glm_gateway column");
        conn.execute(
            "ALTER TABLE settings ADD COLUMN use_glm_gateway INTEGER NOT NULL DEFAULT 1",
            [],
        )?;
        eprintln!("[db] Migration complete: settings table updated");
    }

    // Migration: Add theme to settings if not exists
    if !column_exists(conn, "settings", "theme") {
        eprintln!("[db] Migrating settings table to add theme column");
        conn.execute(
            "ALTER TABLE settings ADD COLUMN theme TEXT NOT NULL DEFAULT 'dark'",
            [],
        )?;
        eprintln!("[db] Migration complete: settings table updated with theme column");
    }

    // Migration: Fix people.lead_id NOT NULL constraint
    // SQLite doesn't support ALTER TABLE to drop constraints, so we recreate the table
    if column_has_notnull(conn, "people", "lead_id") {
        eprintln!("[db] Migrating people table to remove NOT NULL constraint on lead_id");
        conn.execute_batch(
            r#"
            -- Create new table with correct schema
            CREATE TABLE people_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
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

            -- Copy existing data
            INSERT INTO people_new SELECT * FROM people;

            -- Drop old table
            DROP TABLE people;

            -- Rename new table
            ALTER TABLE people_new RENAME TO people;

            -- Recreate index
            CREATE INDEX IF NOT EXISTS idx_people_lead_id ON people(lead_id);
            "#,
        )?;
        eprintln!("[db] Migration complete: people table updated");
    }

    // Migration: Add clerk_org_id columns for multi-tenant support
    let tables_with_org_id = ["leads", "people", "prompts", "scoring_config", "lead_scores", "jobs"];
    for table in tables_with_org_id {
        if !column_exists(conn, table, "clerk_org_id") {
            eprintln!("[db] Migrating {} table to add clerk_org_id column", table);
            conn.execute(
                &format!("ALTER TABLE {} ADD COLUMN clerk_org_id TEXT", table),
                [],
            )?;
            eprintln!("[db] Migration complete: {} table updated", table);
        }
    }

    // Create indexes for clerk_org_id on main tables for performance
    for table in ["leads", "people", "scoring_config", "lead_scores", "prompts", "jobs"] {
        let index_name = format!("idx_{}_clerk_org_id", table);
        conn.execute(
            &format!("CREATE INDEX IF NOT EXISTS {} ON {}(clerk_org_id)", index_name, table),
            [],
        )?;
    }

    // Migration: Remove clerk_org_id columns (single-tenant pivot)
    // Only run if org_binding table exists (indicating single-tenant mode)
    if column_exists(conn, "org_binding", "org_id") {
        migrate_to_single_tenant(conn)?;
    }

    Ok(())
}

/// Migrate to single-tenant by removing clerk_org_id columns
fn migrate_to_single_tenant(conn: &Connection) -> SqliteResult<()> {
    // Tables that have clerk_org_id columns
    let tables_with_clerk_org_id = ["leads", "people", "prompts", "scoring_config", "lead_scores", "jobs"];

    for table in tables_with_clerk_org_id {
        if column_exists(conn, table, "clerk_org_id") {
            eprintln!("[db] Migrating {} table to remove clerk_org_id column (single-tenant)", table);
            migrate_table_remove_clerk_org_id(conn, table)?;
            eprintln!("[db] Migration complete: {} table updated", table);
        }
    }

    // Drop clerk_org_id indexes
    for table in tables_with_clerk_org_id {
        let index_name = format!("idx_{}_clerk_org_id", table);
        conn.execute(&format!("DROP INDEX IF EXISTS {}", index_name), [])?;
    }

    Ok(())
}

/// Migrate a table to remove clerk_org_id column
/// SQLite doesn't support DROP COLUMN, so we recreate the table
fn migrate_table_remove_clerk_org_id(conn: &Connection, table: &str) -> SqliteResult<()> {
    let (columns_without_clerk_org_id, definitions) = get_table_columns_without_clerk_org_id(conn, table)?;

    // Create new table without clerk_org_id
    let create_sql = format!(
        "CREATE TABLE {}_new ({})",
        table,
        definitions.join(", ")
    );
    conn.execute(&create_sql, [])?;

    // Copy data (excluding clerk_org_id)
    let columns_list = columns_without_clerk_org_id.join(", ");
    conn.execute(
        &format!("INSERT INTO {}_new SELECT {} FROM {}", table, columns_list, table),
        [],
    )?;

    // Drop old table
    conn.execute(&format!("DROP TABLE {}", table), [])?;

    // Rename new table
    conn.execute(&format!("ALTER TABLE {}_new RENAME TO {}", table, table), [])?;

    // Recreate indexes (except clerk_org_id indexes)
    recreate_table_indexes(conn, table)?;

    Ok(())
}

/// Get table columns excluding clerk_org_id
fn get_table_columns_without_clerk_org_id(
    conn: &Connection,
    table: &str,
) -> SqliteResult<(Vec<String>, Vec<String>) > {
    let mut columns = Vec::new();
    let mut definitions = Vec::new();

    let query = format!("PRAGMA table_info({})", table);
    let mut stmt = conn.prepare(&query)?;

    let rows = stmt.query_map([], |row| -> Result<Option<(String, String)>, rusqlite::Error> {
        let name: String = row.get(1)?;
        let type_name: String = row.get(2)?;
        let not_null: i64 = row.get(3)?;
        let default_val: Option<String> = row.get(4)?;

        // Skip clerk_org_id column
        if name == "clerk_org_id" {
            return Ok(None);
        }

        let col_def = if not_null != 0 {
            format!("{} {} NOT NULL", name, type_name)
        } else {
            format!("{} {}", name, type_name)
        };

        if let Some(default) = default_val {
            columns.push(format!("\"{}\"", name));
            definitions.push(format!("{} DEFAULT {}", col_def, default));
            Ok(Some((name, col_def)))
        } else {
            columns.push(name.clone());
            definitions.push(col_def.clone());
            Ok(Some((name, col_def)))
        }
    })?;

    for row in rows {
        let _ = row?;
    }

    Ok((columns, definitions))
}

/// Recreate indexes for a table (excluding clerk_org_id indexes)
fn recreate_table_indexes(conn: &Connection, table: &str) -> SqliteResult<()> {
    match table {
        "leads" => {
            // Add back any non-org_id indexes
            // (leads doesn't have other indexes currently)
        }
        "people" => {
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_people_lead_id ON people(lead_id)",
                [],
            )?;
        }
        "lead_scores" => {
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_lead_scores_lead_id ON lead_scores(lead_id)",
                [],
            )?;
        }
        "jobs" => {
            conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)", [])?;
            conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC)", [])?;
        }
        _ => {}
    }
    Ok(())
}

/// Get the default database path
pub fn get_db_path() -> PathBuf {
    let data_dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("liidi");

    data_dir.join("data.db")
}
