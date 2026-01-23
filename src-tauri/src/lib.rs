mod commands;
mod db;
mod events;
mod jobs;

use db::{DbState, get_db_path};
use jobs::JobQueue;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize database
            let db_path = get_db_path();
            let db_state = DbState::new(db_path)
                .expect("Failed to initialize database");

            // Clone the connection Arc for recovery before moving db_state
            let conn_for_recovery = db_state.conn.clone();

            app.manage(db_state);

            // Initialize job queue
            let job_queue = JobQueue::new();
            app.manage(job_queue);

            // Run startup recovery for stale jobs and stuck entities
            jobs::recovery::recover_on_startup(&conn_for_recovery, app.handle());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Lead commands
            commands::get_lead,
            commands::get_all_leads,
            commands::get_adjacent_leads,
            commands::insert_lead,
            commands::update_lead_user_status,
            commands::delete_leads,
            // Person commands
            commands::get_person,
            commands::get_person_raw,
            commands::get_people_for_lead,
            commands::get_all_people,
            commands::get_adjacent_people,
            commands::insert_person,
            commands::update_person_user_status,
            commands::delete_people,
            // Prompt commands
            commands::get_prompt_by_type,
            commands::save_prompt_by_type,
            // Scoring commands
            commands::get_active_scoring_config,
            commands::save_scoring_config,
            commands::get_lead_score,
            commands::get_leads_with_scores,
            commands::get_unscored_leads,
            commands::save_lead_score,
            commands::delete_lead_score,
            // Research commands
            commands::start_research,
            commands::start_person_research,
            commands::kill_job,
            commands::get_active_jobs,
            // Scoring commands
            commands::start_scoring,
            // Conversation commands
            commands::start_conversation_generation,
            // Onboarding commands
            commands::get_onboarding_status,
            // Job commands
            commands::get_jobs_active,
            commands::get_jobs_recent,
            commands::get_job_by_id,
            commands::get_job_logs_cmd,
            commands::cleanup_old_jobs_cmd,
            commands::delete_job_cmd,
            // Recovery commands
            commands::get_stuck_entities,
            commands::reset_entity_status,
            commands::recover_all_stuck,
            // Settings commands
            commands::get_settings,
            commands::update_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
