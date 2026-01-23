use rusqlite::{Connection, Result as SqliteResult, params};
use crate::prompts;

/// Seed default data into the database on fresh install.
/// Uses INSERT OR IGNORE patterns to be idempotent.
pub fn seed_defaults(conn: &Connection) -> SqliteResult<()> {
    seed_prompts(conn)?;
    seed_scoring_config(conn)?;
    Ok(())
}

/// Seed default prompts into the database.
/// Only inserts if no prompt of that type exists.
fn seed_prompts(conn: &Connection) -> SqliteResult<()> {
    let now = chrono::Utc::now().timestamp_millis();

    let prompt_types = [
        ("company", prompts::defaults::COMPANY),
        ("person", prompts::defaults::PERSON),
        ("conversation_topics", prompts::defaults::CONVERSATION_TOPICS),
    ];

    for (prompt_type, content) in prompt_types {
        // Check if prompt already exists
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM prompts WHERE type = ?1)",
            params![prompt_type],
            |row| row.get(0),
        )?;

        if !exists {
            conn.execute(
                "INSERT INTO prompts (type, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                params![prompt_type, content, now, now],
            )?;
        }
    }

    Ok(())
}

/// Seed default scoring configuration.
/// Only inserts if no scoring config exists.
fn seed_scoring_config(conn: &Connection) -> SqliteResult<()> {
    // Check if any scoring config exists
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM scoring_config)",
        [],
        |row| row.get(0),
    )?;

    if exists {
        return Ok(());
    }

    let now = chrono::Utc::now().timestamp_millis();

    // Default required characteristics (pass/fail gates)
    let required_characteristics = serde_json::json!([
        {
            "id": "min-company-size",
            "name": "Minimum Company Size",
            "description": "Company must have at least 50 employees",
            "enabled": true
        },
        {
            "id": "target-industry",
            "name": "Target Industry",
            "description": "Company must be in technology, finance, or healthcare sectors",
            "enabled": true
        }
    ]);

    // Default demand signifiers (weighted scoring factors)
    let demand_signifiers = serde_json::json!([
        {
            "id": "growth-signals",
            "name": "Growth Signals",
            "description": "Recent funding, hiring, or expansion announcements",
            "weight": 8,
            "enabled": true
        },
        {
            "id": "tech-adoption",
            "name": "Technology Adoption",
            "description": "Use of modern tech stack and willingness to adopt new solutions",
            "weight": 7,
            "enabled": true
        },
        {
            "id": "budget-authority",
            "name": "Budget Authority",
            "description": "Evidence of budget and decision-making authority for relevant purchases",
            "weight": 9,
            "enabled": true
        },
        {
            "id": "pain-points",
            "name": "Pain Point Alignment",
            "description": "Company has challenges that our solution addresses",
            "weight": 10,
            "enabled": true
        },
        {
            "id": "timeline-urgency",
            "name": "Timeline Urgency",
            "description": "Indicators of urgency or upcoming projects requiring our solution",
            "weight": 6,
            "enabled": true
        }
    ]);

    conn.execute(
        "INSERT INTO scoring_config (
            name, is_active, required_characteristics, demand_signifiers,
            tier_hot_min, tier_warm_min, tier_nurture_min, created_at, updated_at
        ) VALUES (?1, 1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            "default",
            required_characteristics.to_string(),
            demand_signifiers.to_string(),
            80,  // tier_hot_min
            50,  // tier_warm_min
            30,  // tier_nurture_min
            now,
            now,
        ],
    )?;

    Ok(())
}
