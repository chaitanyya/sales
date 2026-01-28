use rusqlite::{params, Connection, Result as SqliteResult};
use crate::db::schema::*;
use crate::jobs::enrichment::{LeadEnrichment, PersonEnrichment};

// ============================================================================
// Lead Queries
// ============================================================================

pub fn get_lead(conn: &Connection, id: i64) -> SqliteResult<Option<Lead>> {
    let sql = "SELECT id, company_name, website, industry, sub_industry, employees, employee_range,
                    revenue, revenue_range, company_linkedin_url, city, state, country,
                    research_status, researched_at, user_status, created_at, company_profile
             FROM leads WHERE id = ?1";

    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query(params![id])?;

    if let Some(row) = rows.next()? {
        Ok(Some(Lead {
            id: row.get(0)?,
            company_name: row.get(1)?,
            website: row.get(2)?,
            industry: row.get(3)?,
            sub_industry: row.get(4)?,
            employees: row.get(5)?,
            employee_range: row.get(6)?,
            revenue: row.get(7)?,
            revenue_range: row.get(8)?,
            company_linkedin_url: row.get(9)?,
            city: row.get(10)?,
            state: row.get(11)?,
            country: row.get(12)?,
            research_status: row.get::<_, Option<String>>(13)?.unwrap_or_else(|| "pending".to_string()),
            researched_at: row.get(14)?,
            user_status: row.get::<_, Option<String>>(15)?.unwrap_or_else(|| "new".to_string()),
            created_at: row.get(16)?,
            company_profile: row.get(17)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn get_all_leads(conn: &Connection) -> SqliteResult<Vec<Lead>> {
    let sql = "SELECT id, company_name, website, industry, sub_industry, employees, employee_range,
                    revenue, revenue_range, company_linkedin_url, city, state, country,
                    research_status, researched_at, user_status, created_at, company_profile
             FROM leads ORDER BY company_name ASC";

    let mut stmt = conn.prepare(sql)?;

    let rows = stmt.query_map([], |row| {
        Ok(Lead {
            id: row.get(0)?,
            company_name: row.get(1)?,
            website: row.get(2)?,
            industry: row.get(3)?,
            sub_industry: row.get(4)?,
            employees: row.get(5)?,
            employee_range: row.get(6)?,
            revenue: row.get(7)?,
            revenue_range: row.get(8)?,
            company_linkedin_url: row.get(9)?,
            city: row.get(10)?,
            state: row.get(11)?,
            country: row.get(12)?,
            research_status: row.get::<_, Option<String>>(13)?.unwrap_or_else(|| "pending".to_string()),
            researched_at: row.get(14)?,
            user_status: row.get::<_, Option<String>>(15)?.unwrap_or_else(|| "new".to_string()),
            created_at: row.get(16)?,
            company_profile: row.get(17)?,
        })
    })?;

    rows.collect()
}

pub fn get_adjacent_leads(conn: &Connection, current_id: i64) -> SqliteResult<(Option<i64>, Option<i64>, usize, usize)> {
    let sql = "SELECT id FROM leads ORDER BY company_name ASC";

    let all_ids: Vec<i64> = conn.prepare(sql)?
        .query_map([], |row| row.get(0))?
        .collect::<SqliteResult<Vec<_>>>()?;

    let total = all_ids.len();
    let current_index = all_ids.iter().position(|&id| id == current_id).unwrap_or(0);

    let prev_id = if current_index > 0 { Some(all_ids[current_index - 1]) } else { None };
    let next_id = if current_index < total - 1 { Some(all_ids[current_index + 1]) } else { None };

    Ok((prev_id, next_id, current_index + 1, total))
}

pub fn insert_lead(conn: &Connection, data: &NewLead) -> SqliteResult<i64> {
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "INSERT INTO leads (company_name, website, city, state, country, research_status, user_status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending', 'new', ?6)",
        params![data.company_name, data.website, data.city, data.state, data.country, now],
    )?;
    Ok(conn.last_insert_rowid())
}

#[allow(dead_code)] // API function for updating lead research status
pub fn update_lead_research(
    conn: &Connection,
    lead_id: i64,
    status: &str,
    profile: Option<&str>,
) -> SqliteResult<()> {
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "UPDATE leads SET research_status = ?1, company_profile = ?2, researched_at = ?3 WHERE id = ?4",
        params![status, profile, now, lead_id],
    )?;
    Ok(())
}

pub fn update_lead_user_status(conn: &Connection, lead_id: i64, status: &str) -> SqliteResult<()> {
    conn.execute(
        "UPDATE leads SET user_status = ?1 WHERE id = ?2",
        params![status, lead_id],
    )?;
    Ok(())
}

pub fn delete_leads(conn: &Connection, lead_ids: &[i64]) -> SqliteResult<usize> {
    if lead_ids.is_empty() {
        return Ok(0);
    }

    let placeholders: String = lead_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");

    // Delete associated people
    conn.execute(
        &format!("DELETE FROM people WHERE lead_id IN ({})", placeholders),
        rusqlite::params_from_iter(lead_ids.iter()),
    )?;

    // Delete associated scores
    conn.execute(
        &format!("DELETE FROM lead_scores WHERE lead_id IN ({})", placeholders),
        rusqlite::params_from_iter(lead_ids.iter()),
    )?;

    // Delete leads
    let deleted = conn.execute(
        &format!("DELETE FROM leads WHERE id IN ({})", placeholders),
        rusqlite::params_from_iter(lead_ids.iter()),
    )?;

    Ok(deleted)
}

// ============================================================================
// Person Queries
// ============================================================================

pub fn get_person(conn: &Connection, id: i64) -> SqliteResult<Option<PersonWithCompany>> {
    let sql = "SELECT p.id, p.lead_id, p.first_name, p.last_name, p.email, p.title, p.management_level,
                    p.linkedin_url, p.year_joined, p.person_profile, p.research_status, p.researched_at,
                    p.user_status, p.conversation_topics, p.conversation_generated_at, p.created_at,
                    l.company_name, l.website, l.industry
             FROM people p
             LEFT JOIN leads l ON p.lead_id = l.id
             WHERE p.id = ?1";

    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query(params![id])?;

    if let Some(row) = rows.next()? {
        Ok(Some(PersonWithCompany {
            id: row.get(0)?,
            lead_id: row.get(1)?,
            first_name: row.get(2)?,
            last_name: row.get(3)?,
            email: row.get(4)?,
            title: row.get(5)?,
            management_level: row.get(6)?,
            linkedin_url: row.get(7)?,
            year_joined: row.get(8)?,
            person_profile: row.get(9)?,
            research_status: row.get::<_, Option<String>>(10)?.unwrap_or_else(|| "pending".to_string()),
            researched_at: row.get(11)?,
            user_status: row.get::<_, Option<String>>(12)?.unwrap_or_else(|| "new".to_string()),
            conversation_topics: row.get(13)?,
            conversation_generated_at: row.get(14)?,
            created_at: row.get(15)?,
            company_name: row.get(16)?,
            company_website: row.get(17)?,
            company_industry: row.get(18)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn get_person_raw(conn: &Connection, id: i64) -> SqliteResult<Option<Person>> {
    let sql = "SELECT id, lead_id, first_name, last_name, email, title, management_level,
                    linkedin_url, year_joined, person_profile, research_status, researched_at,
                    user_status, conversation_topics, conversation_generated_at, created_at
             FROM people WHERE id = ?1";

    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query(params![id])?;

    if let Some(row) = rows.next()? {
        Ok(Some(Person {
            id: row.get(0)?,
            lead_id: row.get(1)?,
            first_name: row.get(2)?,
            last_name: row.get(3)?,
            email: row.get(4)?,
            title: row.get(5)?,
            management_level: row.get(6)?,
            linkedin_url: row.get(7)?,
            year_joined: row.get(8)?,
            person_profile: row.get(9)?,
            research_status: row.get::<_, Option<String>>(10)?.unwrap_or_else(|| "pending".to_string()),
            researched_at: row.get(11)?,
            user_status: row.get::<_, Option<String>>(12)?.unwrap_or_else(|| "new".to_string()),
            conversation_topics: row.get(13)?,
            conversation_generated_at: row.get(14)?,
            created_at: row.get(15)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn get_people_for_lead(conn: &Connection, lead_id: i64) -> SqliteResult<Vec<Person>> {
    let sql = "SELECT id, lead_id, first_name, last_name, email, title, management_level,
                    linkedin_url, year_joined, person_profile, research_status, researched_at,
                    user_status, conversation_topics, conversation_generated_at, created_at
             FROM people WHERE lead_id = ?1 ORDER BY last_name ASC, first_name ASC";

    let mut stmt = conn.prepare(sql)?;

    let rows = stmt.query_map(params![lead_id], |row| {
        Ok(Person {
            id: row.get(0)?,
            lead_id: row.get(1)?,
            first_name: row.get(2)?,
            last_name: row.get(3)?,
            email: row.get(4)?,
            title: row.get(5)?,
            management_level: row.get(6)?,
            linkedin_url: row.get(7)?,
            year_joined: row.get(8)?,
            person_profile: row.get(9)?,
            research_status: row.get::<_, Option<String>>(10)?.unwrap_or_else(|| "pending".to_string()),
            researched_at: row.get(11)?,
            user_status: row.get::<_, Option<String>>(12)?.unwrap_or_else(|| "new".to_string()),
            conversation_topics: row.get(13)?,
            conversation_generated_at: row.get(14)?,
            created_at: row.get(15)?,
        })
    })?;

    rows.collect()
}

pub fn get_all_people(conn: &Connection) -> SqliteResult<Vec<PersonWithCompany>> {
    let sql = "SELECT p.id, p.lead_id, p.first_name, p.last_name, p.email, p.title, p.management_level,
                    p.linkedin_url, p.year_joined, p.person_profile, p.research_status, p.researched_at,
                    p.user_status, p.conversation_topics, p.conversation_generated_at, p.created_at,
                    l.company_name, l.website, l.industry
             FROM people p
             LEFT JOIN leads l ON p.lead_id = l.id
             ORDER BY p.last_name ASC, p.first_name ASC";

    let mut stmt = conn.prepare(sql)?;

    let rows = stmt.query_map([], |row| {
        Ok(PersonWithCompany {
            id: row.get(0)?,
            lead_id: row.get(1)?,
            first_name: row.get(2)?,
            last_name: row.get(3)?,
            email: row.get(4)?,
            title: row.get(5)?,
            management_level: row.get(6)?,
            linkedin_url: row.get(7)?,
            year_joined: row.get(8)?,
            person_profile: row.get(9)?,
            research_status: row.get::<_, Option<String>>(10)?.unwrap_or_else(|| "pending".to_string()),
            researched_at: row.get(11)?,
            user_status: row.get::<_, Option<String>>(12)?.unwrap_or_else(|| "new".to_string()),
            conversation_topics: row.get(13)?,
            conversation_generated_at: row.get(14)?,
            created_at: row.get(15)?,
            company_name: row.get(16)?,
            company_website: row.get(17)?,
            company_industry: row.get(18)?,
        })
    })?;

    rows.collect()
}

pub fn get_adjacent_people(conn: &Connection, current_id: i64) -> SqliteResult<(Option<i64>, Option<i64>, usize, usize)> {
    let sql = "SELECT id FROM people ORDER BY last_name ASC, first_name ASC";

    let all_ids: Vec<i64> = conn.prepare(sql)?
        .query_map([], |row| row.get(0))?
        .collect::<SqliteResult<Vec<_>>>()?;

    let total = all_ids.len();
    let current_index = all_ids.iter().position(|&id| id == current_id).unwrap_or(0);

    let prev_id = if current_index > 0 { Some(all_ids[current_index - 1]) } else { None };
    let next_id = if current_index < total - 1 { Some(all_ids[current_index + 1]) } else { None };

    Ok((prev_id, next_id, current_index + 1, total))
}

pub fn insert_person(conn: &Connection, data: &NewPerson) -> SqliteResult<i64> {
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "INSERT INTO people (first_name, last_name, email, title, linkedin_url, lead_id, research_status, user_status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', 'new', ?7)",
        params![data.first_name, data.last_name, data.email, data.title, data.linkedin_url, data.lead_id, now],
    )?;
    Ok(conn.last_insert_rowid())
}

#[allow(dead_code)] // API function for cascade delete
pub fn delete_people_for_lead(conn: &Connection, lead_id: i64) -> SqliteResult<()> {
    conn.execute(
        "DELETE FROM people WHERE lead_id = ?1",
        params![lead_id],
    )?;
    Ok(())
}

#[allow(dead_code)] // API function for batch people insertion
pub fn insert_people_for_lead(conn: &Connection, lead_id: i64, people: &[NewPerson]) -> SqliteResult<()> {
    let now = chrono::Utc::now().timestamp();
    for p in people {
        conn.execute(
            "INSERT INTO people (first_name, last_name, email, title, linkedin_url, year_joined, lead_id, research_status, user_status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', 'new', ?8)",
            params![p.first_name, p.last_name, p.email, p.title, None::<String>, None::<i64>, lead_id, now],
        )?;
    }
    Ok(())
}

#[allow(dead_code)] // API function for updating person research status
pub fn update_person_research(
    conn: &Connection,
    person_id: i64,
    status: &str,
    profile: Option<&str>,
) -> SqliteResult<()> {
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "UPDATE people SET research_status = ?1, person_profile = ?2, researched_at = ?3 WHERE id = ?4",
        params![status, profile, now, person_id],
    )?;
    Ok(())
}

#[allow(dead_code)] // API function for updating person conversation
pub fn update_person_conversation(
    conn: &Connection,
    person_id: i64,
    topics: Option<&str>,
) -> SqliteResult<()> {
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "UPDATE people SET conversation_topics = ?1, conversation_generated_at = ?2 WHERE id = ?3",
        params![topics, now, person_id],
    )?;
    Ok(())
}

pub fn update_person_user_status(conn: &Connection, person_id: i64, status: &str) -> SqliteResult<()> {
    conn.execute(
        "UPDATE people SET user_status = ?1 WHERE id = ?2",
        params![status, person_id],
    )?;
    Ok(())
}

pub fn delete_people(conn: &Connection, person_ids: &[i64]) -> SqliteResult<usize> {
    if person_ids.is_empty() {
        return Ok(0);
    }

    let placeholders: String = person_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");

    let deleted = conn.execute(
        &format!("DELETE FROM people WHERE id IN ({})", placeholders),
        rusqlite::params_from_iter(person_ids.iter()),
    )?;

    Ok(deleted)
}

// ============================================================================
// Prompt Queries
// ============================================================================

pub fn get_prompt_by_type(conn: &Connection, prompt_type: &str) -> SqliteResult<Option<Prompt>> {
    let sql = "SELECT id, type, content, created_at, updated_at
             FROM prompts WHERE type = ?1 ORDER BY id DESC LIMIT 1";

    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query(params![prompt_type])?;

    if let Some(row) = rows.next()? {
        Ok(Some(Prompt {
            id: row.get(0)?,
            prompt_type: row.get(1)?,
            content: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn save_prompt_by_type(conn: &Connection, prompt_type: &str, content: &str) -> SqliteResult<i64> {
    let now = chrono::Utc::now().timestamp();

    let existing: Option<i64> = conn.query_row(
        "SELECT id FROM prompts WHERE type = ?1 ORDER BY id DESC LIMIT 1",
        params![prompt_type],
        |row| row.get(0),
    ).ok();

    if let Some(id) = existing {
        conn.execute(
            "UPDATE prompts SET content = ?1, updated_at = ?2 WHERE id = ?3",
            params![content, now, id],
        )?;
        Ok(id)
    } else {
        conn.execute(
            "INSERT INTO prompts (type, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
            params![prompt_type, content, now, now],
        )?;
        Ok(conn.last_insert_rowid())
    }
}

// ============================================================================
// Scoring Config Queries
// ============================================================================

pub fn get_active_scoring_config(conn: &Connection) -> SqliteResult<Option<ParsedScoringConfig>> {
    let sql = "SELECT id, name, is_active, required_characteristics, demand_signifiers,
                    tier_hot_min, tier_warm_min, tier_nurture_min, created_at, updated_at
             FROM scoring_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1";

    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query([])?;

    if let Some(row) = rows.next()? {
        let required_chars: String = row.get(3)?;
        let demand_sigs: String = row.get(4)?;

        Ok(Some(ParsedScoringConfig {
            id: row.get(0)?,
            name: row.get(1)?,
            is_active: row.get(2)?,
            required_characteristics: serde_json::from_str(&required_chars).unwrap_or(serde_json::Value::Array(vec![])),
            demand_signifiers: serde_json::from_str(&demand_sigs).unwrap_or(serde_json::Value::Array(vec![])),
            tier_hot_min: row.get(5)?,
            tier_warm_min: row.get(6)?,
            tier_nurture_min: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn save_scoring_config(
    conn: &Connection,
    name: &str,
    required_characteristics: &str,
    demand_signifiers: &str,
    tier_hot_min: i64,
    tier_warm_min: i64,
    tier_nurture_min: i64,
    id: Option<i64>,
) -> SqliteResult<i64> {
    let now = chrono::Utc::now().timestamp();

    if let Some(existing_id) = id {
        conn.execute(
            "UPDATE scoring_config SET name = ?1, required_characteristics = ?2, demand_signifiers = ?3,
             tier_hot_min = ?4, tier_warm_min = ?5, tier_nurture_min = ?6, updated_at = ?7 WHERE id = ?8",
            params![name, required_characteristics, demand_signifiers, tier_hot_min, tier_warm_min, tier_nurture_min, now, existing_id],
        )?;
        Ok(existing_id)
    } else {
        // Deactivate all existing configs
        conn.execute("UPDATE scoring_config SET is_active = 0", [])?;
        conn.execute(
            "INSERT INTO scoring_config (name, is_active, required_characteristics, demand_signifiers,
             tier_hot_min, tier_warm_min, tier_nurture_min, created_at, updated_at)
             VALUES (?1, 1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![name, required_characteristics, demand_signifiers, tier_hot_min, tier_warm_min, tier_nurture_min, now, now],
        )?;
        Ok(conn.last_insert_rowid())
    }
}

// ============================================================================
// Lead Score Queries
// ============================================================================

pub fn get_lead_score(conn: &Connection, lead_id: i64) -> SqliteResult<Option<ParsedLeadScore>> {
    let sql = "SELECT id, lead_id, config_id, passes_requirements, requirement_results,
                    total_score, score_breakdown, tier, scoring_notes, scored_at, created_at
             FROM lead_scores WHERE lead_id = ?1 ORDER BY id DESC LIMIT 1";

    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query(params![lead_id])?;

    if let Some(row) = rows.next()? {
        let req_results: String = row.get(4)?;
        let score_breakdown: String = row.get(6)?;

        Ok(Some(ParsedLeadScore {
            id: row.get(0)?,
            lead_id: row.get(1)?,
            config_id: row.get(2)?,
            passes_requirements: row.get(3)?,
            requirement_results: serde_json::from_str(&req_results).unwrap_or(serde_json::Value::Array(vec![])),
            total_score: row.get(5)?,
            score_breakdown: serde_json::from_str(&score_breakdown).unwrap_or(serde_json::Value::Array(vec![])),
            tier: row.get(7)?,
            scoring_notes: row.get(8)?,
            scored_at: row.get(9)?,
            created_at: row.get(10)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn get_leads_with_scores(conn: &Connection) -> SqliteResult<Vec<LeadWithScore>> {
    let leads = get_all_leads(conn)?;
    let mut result = Vec::with_capacity(leads.len());

    for lead in &leads {
        let score = get_lead_score(conn, lead.id)?;
        result.push(LeadWithScore { lead: lead.clone(), score });
    }

    Ok(result)
}

pub fn get_unscored_leads(conn: &Connection) -> SqliteResult<Vec<Lead>> {
    let sql = "SELECT l.id, l.company_name, l.website, l.industry, l.sub_industry, l.employees, l.employee_range,
                    l.revenue, l.revenue_range, l.company_linkedin_url, l.city, l.state, l.country,
                    l.research_status, l.researched_at, l.user_status, l.created_at, l.company_profile
             FROM leads l
             LEFT JOIN lead_scores ls ON l.id = ls.lead_id
             WHERE ls.id IS NULL
             ORDER BY l.company_name ASC";

    let mut stmt = conn.prepare(sql)?;

    let rows = stmt.query_map([], |row| {
        Ok(Lead {
            id: row.get(0)?,
            company_name: row.get(1)?,
            website: row.get(2)?,
            industry: row.get(3)?,
            sub_industry: row.get(4)?,
            employees: row.get(5)?,
            employee_range: row.get(6)?,
            revenue: row.get(7)?,
            revenue_range: row.get(8)?,
            company_linkedin_url: row.get(9)?,
            city: row.get(10)?,
            state: row.get(11)?,
            country: row.get(12)?,
            research_status: row.get::<_, Option<String>>(13)?.unwrap_or_else(|| "pending".to_string()),
            researched_at: row.get(14)?,
            user_status: row.get::<_, Option<String>>(15)?.unwrap_or_else(|| "new".to_string()),
            created_at: row.get(16)?,
            company_profile: row.get(17)?,
        })
    })?;

    rows.collect()
}

pub fn save_lead_score(
    conn: &Connection,
    lead_id: i64,
    config_id: i64,
    passes_requirements: bool,
    requirement_results: &str,
    total_score: i64,
    score_breakdown: &str,
    tier: &str,
    scoring_notes: Option<&str>,
) -> SqliteResult<i64> {
    let now = chrono::Utc::now().timestamp();

    // Delete existing scores for this lead
    conn.execute("DELETE FROM lead_scores WHERE lead_id = ?1", params![lead_id])?;
    conn.execute(
        "INSERT INTO lead_scores (lead_id, config_id, passes_requirements, requirement_results,
         total_score, score_breakdown, tier, scoring_notes, scored_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![lead_id, config_id, passes_requirements, requirement_results, total_score, score_breakdown, tier, scoring_notes, now, now],
    )?;

    Ok(conn.last_insert_rowid())
}

pub fn delete_lead_score(conn: &Connection, lead_id: i64) -> SqliteResult<()> {
    conn.execute("DELETE FROM lead_scores WHERE lead_id = ?1", params![lead_id])?;
    Ok(())
}

// ============================================================================
// Job Queries
// ============================================================================

pub fn insert_job(conn: &Connection, job: &NewJob) -> SqliteResult<String> {
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "INSERT INTO jobs (id, job_type, entity_id, entity_label, status, prompt, model, working_dir, output_path, created_at)
         VALUES (?1, ?2, ?3, ?4, 'queued', ?5, ?6, ?7, ?8, ?9)",
        params![
            job.id,
            job.job_type,
            job.entity_id,
            job.entity_label,
            job.prompt,
            job.model,
            job.working_dir,
            job.output_path,
            now,
        ],
    )?;
    Ok(job.id.clone())
}

pub fn update_job_status(
    conn: &Connection,
    job_id: &str,
    status: &str,
    exit_code: Option<i32>,
    error_message: Option<&str>,
) -> SqliteResult<()> {
    let now = chrono::Utc::now().timestamp();

    // If transitioning to running, set started_at
    // If transitioning to completed/error/timeout/cancelled, set completed_at
    match status {
        "running" => {
            conn.execute(
                "UPDATE jobs SET status = ?1, started_at = ?2 WHERE id = ?3",
                params![status, now, job_id],
            )?;
        }
        "completed" | "error" | "timeout" | "cancelled" => {
            conn.execute(
                "UPDATE jobs SET status = ?1, exit_code = ?2, error_message = ?3, completed_at = ?4 WHERE id = ?5",
                params![status, exit_code, error_message, now, job_id],
            )?;
        }
        _ => {
            conn.execute(
                "UPDATE jobs SET status = ?1 WHERE id = ?2",
                params![status, job_id],
            )?;
        }
    }
    Ok(())
}

pub fn update_job_pid(conn: &Connection, job_id: &str, pid: u32) -> SqliteResult<()> {
    conn.execute(
        "UPDATE jobs SET pid = ?1 WHERE id = ?2",
        params![pid as i64, job_id],
    )?;
    Ok(())
}

pub fn update_job_claude_session(
    conn: &Connection,
    job_id: &str,
    session_id: &str,
    model: &str,
) -> SqliteResult<()> {
    conn.execute(
        "UPDATE jobs SET claude_session_id = ?1, claude_model = ?2 WHERE id = ?3",
        params![session_id, model, job_id],
    )?;
    Ok(())
}

#[allow(dead_code)] // API function for job event index tracking
pub fn update_job_last_event_index(conn: &Connection, job_id: &str, index: i64) -> SqliteResult<()> {
    conn.execute(
        "UPDATE jobs SET last_event_index = ?1 WHERE id = ?2",
        params![index, job_id],
    )?;
    Ok(())
}

pub fn update_job_stream_stats(
    conn: &Connection,
    job_id: &str,
    stdout_truncated: bool,
    stderr_truncated: bool,
    total_stdout_bytes: i64,
    total_stderr_bytes: i64,
) -> SqliteResult<()> {
    conn.execute(
        "UPDATE jobs SET stdout_truncated = ?1, stderr_truncated = ?2, total_stdout_bytes = ?3, total_stderr_bytes = ?4 WHERE id = ?5",
        params![stdout_truncated as i64, stderr_truncated as i64, total_stdout_bytes, total_stderr_bytes, job_id],
    )?;
    Ok(())
}

pub fn update_job_completion_state(conn: &Connection, job_id: &str, state: Option<&str>) -> SqliteResult<()> {
    conn.execute(
        "UPDATE jobs SET completion_state = ?1 WHERE id = ?2",
        params![state, job_id],
    )?;
    Ok(())
}

pub fn get_job(conn: &Connection, job_id: &str) -> SqliteResult<Option<Job>> {
    let sql = "SELECT id, job_type, entity_id, entity_label, status, prompt, model, working_dir,
                    output_path, exit_code, error_message, created_at, started_at, completed_at,
                    pid, claude_session_id, claude_model, last_event_index,
                    stdout_truncated, stderr_truncated, total_stdout_bytes, total_stderr_bytes, completion_state
             FROM jobs WHERE id = ?1";

    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query(params![job_id])?;

    if let Some(row) = rows.next()? {
        Ok(Some(Job {
            id: row.get(0)?,
            job_type: row.get(1)?,
            entity_id: row.get(2)?,
            entity_label: row.get(3)?,
            status: row.get(4)?,
            prompt: row.get(5)?,
            model: row.get(6)?,
            working_dir: row.get(7)?,
            output_path: row.get(8)?,
            exit_code: row.get(9)?,
            error_message: row.get(10)?,
            created_at: row.get(11)?,
            started_at: row.get(12)?,
            completed_at: row.get(13)?,
            pid: row.get(14)?,
            claude_session_id: row.get(15)?,
            claude_model: row.get(16)?,
            last_event_index: row.get::<_, Option<i64>>(17)?.unwrap_or(0),
            stdout_truncated: row.get::<_, Option<i64>>(18)?.unwrap_or(0) != 0,
            stderr_truncated: row.get::<_, Option<i64>>(19)?.unwrap_or(0) != 0,
            total_stdout_bytes: row.get::<_, Option<i64>>(20)?.unwrap_or(0),
            total_stderr_bytes: row.get::<_, Option<i64>>(21)?.unwrap_or(0),
            completion_state: row.get(22)?,
        }))
    } else {
        Ok(None)
    }
}

/// Get active job for a specific entity and job type (used to prevent duplicate jobs)
pub fn get_active_job_for_entity(
    conn: &Connection,
    entity_id: i64,
    job_type: &str,
) -> SqliteResult<Option<Job>> {
    let sql = "SELECT id, job_type, entity_id, entity_label, status, prompt, model, working_dir,
                    output_path, exit_code, error_message, created_at, started_at, completed_at,
                    pid, claude_session_id, claude_model, last_event_index,
                    stdout_truncated, stderr_truncated, total_stdout_bytes, total_stderr_bytes, completion_state
             FROM jobs
             WHERE entity_id = ?1 AND job_type = ?2 AND status IN ('queued', 'running')
             ORDER BY created_at DESC
             LIMIT 1";

    let mut stmt = conn.prepare(sql)?;
    let mut rows = stmt.query(params![entity_id, job_type])?;

    if let Some(row) = rows.next()? {
        Ok(Some(Job {
            id: row.get(0)?,
            job_type: row.get(1)?,
            entity_id: row.get(2)?,
            entity_label: row.get(3)?,
            status: row.get(4)?,
            prompt: row.get(5)?,
            model: row.get(6)?,
            working_dir: row.get(7)?,
            output_path: row.get(8)?,
            exit_code: row.get(9)?,
            error_message: row.get(10)?,
            created_at: row.get(11)?,
            started_at: row.get(12)?,
            completed_at: row.get(13)?,
            pid: row.get(14)?,
            claude_session_id: row.get(15)?,
            claude_model: row.get(16)?,
            last_event_index: row.get::<_, Option<i64>>(17)?.unwrap_or(0),
            stdout_truncated: row.get::<_, Option<i64>>(18)?.unwrap_or(0) != 0,
            stderr_truncated: row.get::<_, Option<i64>>(19)?.unwrap_or(0) != 0,
            total_stdout_bytes: row.get::<_, Option<i64>>(20)?.unwrap_or(0),
            total_stderr_bytes: row.get::<_, Option<i64>>(21)?.unwrap_or(0),
            completion_state: row.get(22)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn get_active_jobs_db(conn: &Connection) -> SqliteResult<Vec<Job>> {
    let sql = "SELECT id, job_type, entity_id, entity_label, status, prompt, model, working_dir,
                    output_path, exit_code, error_message, created_at, started_at, completed_at,
                    pid, claude_session_id, claude_model, last_event_index,
                    stdout_truncated, stderr_truncated, total_stdout_bytes, total_stderr_bytes, completion_state
             FROM jobs WHERE status IN ('queued', 'running')
             ORDER BY created_at DESC";

    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([], |row| {
        Ok(Job {
            id: row.get(0)?,
            job_type: row.get(1)?,
            entity_id: row.get(2)?,
            entity_label: row.get(3)?,
            status: row.get(4)?,
            prompt: row.get(5)?,
            model: row.get(6)?,
            working_dir: row.get(7)?,
            output_path: row.get(8)?,
            exit_code: row.get(9)?,
            error_message: row.get(10)?,
            created_at: row.get(11)?,
            started_at: row.get(12)?,
            completed_at: row.get(13)?,
            pid: row.get(14)?,
            claude_session_id: row.get(15)?,
            claude_model: row.get(16)?,
            last_event_index: row.get::<_, Option<i64>>(17)?.unwrap_or(0),
            stdout_truncated: row.get::<_, Option<i64>>(18)?.unwrap_or(0) != 0,
            stderr_truncated: row.get::<_, Option<i64>>(19)?.unwrap_or(0) != 0,
            total_stdout_bytes: row.get::<_, Option<i64>>(20)?.unwrap_or(0),
            total_stderr_bytes: row.get::<_, Option<i64>>(21)?.unwrap_or(0),
            completion_state: row.get(22)?,
        })
    })?;

    rows.collect()
}

pub fn get_recent_jobs(conn: &Connection, limit: i64) -> SqliteResult<Vec<Job>> {
    let sql = "SELECT id, job_type, entity_id, entity_label, status, prompt, model, working_dir,
                    output_path, exit_code, error_message, created_at, started_at, completed_at,
                    pid, claude_session_id, claude_model, last_event_index,
                    stdout_truncated, stderr_truncated, total_stdout_bytes, total_stderr_bytes, completion_state
             FROM jobs
             ORDER BY created_at DESC
             LIMIT ?1";

    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map(params![limit], |row| {
        Ok(Job {
            id: row.get(0)?,
            job_type: row.get(1)?,
            entity_id: row.get(2)?,
            entity_label: row.get(3)?,
            status: row.get(4)?,
            prompt: row.get(5)?,
            model: row.get(6)?,
            working_dir: row.get(7)?,
            output_path: row.get(8)?,
            exit_code: row.get(9)?,
            error_message: row.get(10)?,
            created_at: row.get(11)?,
            started_at: row.get(12)?,
            completed_at: row.get(13)?,
            pid: row.get(14)?,
            claude_session_id: row.get(15)?,
            claude_model: row.get(16)?,
            last_event_index: row.get::<_, Option<i64>>(17)?.unwrap_or(0),
            stdout_truncated: row.get::<_, Option<i64>>(18)?.unwrap_or(0) != 0,
            stderr_truncated: row.get::<_, Option<i64>>(19)?.unwrap_or(0) != 0,
            total_stdout_bytes: row.get::<_, Option<i64>>(20)?.unwrap_or(0),
            total_stderr_bytes: row.get::<_, Option<i64>>(21)?.unwrap_or(0),
            completion_state: row.get(22)?,
        })
    })?;

    rows.collect()
}

pub fn cleanup_old_jobs(conn: &Connection, days: i64) -> SqliteResult<usize> {
    let cutoff = chrono::Utc::now().timestamp() - (days * 24 * 60 * 60);

    // First delete logs for old jobs
    conn.execute(
        "DELETE FROM job_logs WHERE job_id IN (SELECT id FROM jobs WHERE created_at < ?1)",
        params![cutoff],
    )?;

    // Then delete old jobs
    let deleted = conn.execute(
        "DELETE FROM jobs WHERE created_at < ?1",
        params![cutoff],
    )?;

    Ok(deleted)
}

// ============================================================================
// Job Log Queries
// ============================================================================

#[allow(dead_code)] // API function for single log insertion
pub fn insert_job_log(
    conn: &Connection,
    job_id: &str,
    log_type: &str,
    content: &str,
    tool_name: Option<&str>,
    sequence: i64,
) -> SqliteResult<i64> {
    let now = chrono::Utc::now().timestamp_millis();
    conn.execute(
        "INSERT INTO job_logs (job_id, log_type, content, tool_name, timestamp, sequence)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![job_id, log_type, content, tool_name, now, sequence],
    )?;
    Ok(conn.last_insert_rowid())
}

#[allow(dead_code)] // API function for batch log insertion (legacy, use insert_job_logs_batch_full)
pub fn insert_job_logs_batch(
    conn: &Connection,
    logs: &[(String, String, String, Option<String>, i64)], // (job_id, log_type, content, tool_name, sequence)
) -> SqliteResult<()> {
    insert_job_logs_batch_with_source(conn, logs, "stdout")
}

#[allow(dead_code)] // API function for batch log insertion with source
pub fn insert_job_logs_batch_with_source(
    conn: &Connection,
    logs: &[(String, String, String, Option<String>, i64)], // (job_id, log_type, content, tool_name, sequence)
    source: &str,
) -> SqliteResult<()> {
    let now = chrono::Utc::now().timestamp_millis();
    let mut stmt = conn.prepare(
        "INSERT INTO job_logs (job_id, log_type, content, tool_name, timestamp, sequence, source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
    )?;

    for (job_id, log_type, content, tool_name, sequence) in logs {
        stmt.execute(params![job_id, log_type, content, tool_name, now, sequence, source])?;
    }

    Ok(())
}

/// Batch log entry with source information
pub struct BatchLogEntry {
    pub job_id: String,
    pub log_type: String,
    pub content: String,
    pub tool_name: Option<String>,
    pub sequence: i64,
    pub source: String,
}

pub fn insert_job_logs_batch_full(
    conn: &Connection,
    logs: &[BatchLogEntry],
) -> SqliteResult<()> {
    let now = chrono::Utc::now().timestamp_millis();
    let mut stmt = conn.prepare(
        "INSERT INTO job_logs (job_id, log_type, content, tool_name, timestamp, sequence, source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
    )?;

    for log in logs {
        stmt.execute(params![log.job_id, log.log_type, log.content, log.tool_name, now, log.sequence, log.source])?;
    }

    Ok(())
}

pub fn get_job_logs(
    conn: &Connection,
    job_id: &str,
    after_sequence: Option<i64>,
    limit: Option<i64>,
) -> SqliteResult<Vec<JobLog>> {
    // Build query dynamically
    let mut query = String::from(
        "SELECT id, job_id, log_type, content, tool_name, timestamp, sequence, source FROM job_logs WHERE job_id = ?1"
    );

    if after_sequence.is_some() {
        query.push_str(" AND sequence > ?2");
    }

    query.push_str(" ORDER BY sequence ASC");

    if let Some(lim) = limit {
        query.push_str(&format!(" LIMIT {}", lim));
    }

    let mut stmt = conn.prepare(&query)?;

    let mut results = Vec::new();

    if let Some(seq) = after_sequence {
        let mut rows = stmt.query(params![job_id, seq])?;
        while let Some(row) = rows.next()? {
            results.push(JobLog {
                id: row.get(0)?,
                job_id: row.get(1)?,
                log_type: row.get(2)?,
                content: row.get(3)?,
                tool_name: row.get(4)?,
                timestamp: row.get(5)?,
                sequence: row.get(6)?,
                source: row.get::<_, Option<String>>(7)?.unwrap_or_else(|| "stdout".to_string()),
            });
        }
    } else {
        let mut rows = stmt.query(params![job_id])?;
        while let Some(row) = rows.next()? {
            results.push(JobLog {
                id: row.get(0)?,
                job_id: row.get(1)?,
                log_type: row.get(2)?,
                content: row.get(3)?,
                tool_name: row.get(4)?,
                timestamp: row.get(5)?,
                sequence: row.get(6)?,
                source: row.get::<_, Option<String>>(7)?.unwrap_or_else(|| "stdout".to_string()),
            });
        }
    }

    Ok(results)
}

#[allow(dead_code)] // API function for getting log count
pub fn get_job_log_count(conn: &Connection, job_id: &str) -> SqliteResult<i64> {
    conn.query_row(
        "SELECT COUNT(*) FROM job_logs WHERE job_id = ?1",
        params![job_id],
        |row| row.get(0),
    )
}

pub fn delete_job(conn: &Connection, job_id: &str) -> SqliteResult<()> {
    // Delete logs first (foreign key constraint)
    conn.execute(
        "DELETE FROM job_logs WHERE job_id = ?1",
        params![job_id],
    )?;

    // Delete the job
    conn.execute(
        "DELETE FROM jobs WHERE id = ?1",
        params![job_id],
    )?;

    Ok(())
}

// ============================================================================
// Settings Queries
// ============================================================================

pub fn get_settings(conn: &Connection) -> SqliteResult<Settings> {
    let mut stmt = conn.prepare(
        "SELECT model, use_chrome, use_glm_gateway, updated_at FROM settings WHERE id = 1"
    )?;

    let mut rows = stmt.query([])?;

    if let Some(row) = rows.next()? {
        Ok(Settings {
            model: row.get(0)?,
            use_chrome: row.get::<_, i64>(1)? != 0,
            use_glm_gateway: row.get::<_, i64>(2)? != 0,
            updated_at: row.get(3)?,
        })
    } else {
        // Return defaults if no settings exist
        Ok(Settings {
            model: "sonnet".to_string(),
            use_chrome: false,
            use_glm_gateway: true, // Default to true as requested
            updated_at: chrono::Utc::now().timestamp_millis(),
        })
    }
}

pub fn update_settings(
    conn: &Connection,
    model: &str,
    use_chrome: bool,
    use_glm_gateway: bool,
) -> SqliteResult<()> {
    let now = chrono::Utc::now().timestamp_millis();
    conn.execute(
        "INSERT OR REPLACE INTO settings (id, model, use_chrome, use_glm_gateway, updated_at)
         VALUES (1, ?1, ?2, ?3, ?4)",
        params![model, use_chrome as i64, use_glm_gateway as i64, now],
    )?;
    Ok(())
}

// ============================================================================
// Enrichment Queries
// ============================================================================

/// Enrich lead data, only updating fields that are currently NULL
/// This preserves any user-entered or previously enriched data
pub fn enrich_lead<C: std::ops::Deref<Target = Connection>>(
    conn: &C,
    lead_id: i64,
    e: &LeadEnrichment,
) -> SqliteResult<usize> {
    let sql = "UPDATE leads SET
                website = COALESCE(website, ?1),
                industry = COALESCE(industry, ?2),
                sub_industry = COALESCE(sub_industry, ?3),
                employees = COALESCE(employees, ?4),
                employee_range = COALESCE(employee_range, ?5),
                revenue = COALESCE(revenue, ?6),
                revenue_range = COALESCE(revenue_range, ?7),
                company_linkedin_url = COALESCE(company_linkedin_url, ?8),
                city = COALESCE(city, ?9),
                state = COALESCE(state, ?10),
                country = COALESCE(country, ?11)
             WHERE id = ?12";
    conn.execute(
        sql,
        params![
            e.website,
            e.industry,
            e.sub_industry,
            e.employees,
            e.employee_range,
            e.revenue,
            e.revenue_range,
            e.company_linkedin_url,
            e.city,
            e.state,
            e.country,
            lead_id,
        ],
    )
}

/// Enrich person data, only updating fields that are currently NULL
/// This preserves any user-entered or previously enriched data
pub fn enrich_person<C: std::ops::Deref<Target = Connection>>(
    conn: &C,
    person_id: i64,
    e: &PersonEnrichment,
) -> SqliteResult<usize> {
    let sql = "UPDATE people SET
                email = COALESCE(email, ?1),
                title = COALESCE(title, ?2),
                management_level = COALESCE(management_level, ?3),
                linkedin_url = COALESCE(linkedin_url, ?4),
                year_joined = COALESCE(year_joined, ?5)
             WHERE id = ?6";
    conn.execute(
        sql,
        params![
            e.email,
            e.title,
            e.management_level,
            e.linkedin_url,
            e.year_joined,
            person_id,
        ],
    )
}
