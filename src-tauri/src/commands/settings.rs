use tauri::State;
use crate::db::{self, DbState, Settings};

#[tauri::command]
pub fn get_settings(state: State<'_, DbState>) -> Result<Settings, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_settings(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
#[allow(non_snake_case)]
pub fn update_settings(
    state: State<'_, DbState>,
    model: String,
    useChrome: bool,
    useGlmGateway: bool,
    theme: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::update_settings(&conn, &model, useChrome, useGlmGateway, &theme).map_err(|e| e.to_string())
}
