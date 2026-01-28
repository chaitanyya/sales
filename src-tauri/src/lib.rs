mod commands;
mod crypto;
mod db;
mod events;
mod jobs;
mod prompts;
mod subscription;

use db::{DbState, get_db_path};
use jobs::JobQueue;
use tauri::{
    Manager,
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load environment variables from .env file
    dotenvy::dotenv().ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
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

            // Setup system tray
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_item = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let tray_icon = Image::from_bytes(include_bytes!("../icons/menubar.png"))?;
            TrayIconBuilder::new()
                .icon(tray_icon)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Hide the window and remove focus instead of closing
                let _ = window.hide();
                #[cfg(target_os = "macos")]
                {
                    let app = window.app_handle();
                    let _ = app.hide();
                }
                api.prevent_close();
            }
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
            // Storage commands (for Clerk auth)
            commands::storage_get,
            commands::storage_set,
            commands::storage_remove,
            commands::storage_clear,
            commands::storage_keys,
            // Subscription commands
            commands::get_subscription_status,
            commands::check_lockout,
            commands::validate_subscription_token,
            commands::update_subscription_status,
            commands::clear_subscription_state,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // Handle macOS dock icon click
            if let tauri::RunEvent::Reopen { has_visible_windows, .. } = event {
                if !has_visible_windows {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                }
            }
        });
}
