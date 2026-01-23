use tauri::State;
use crate::db::{self, DbState, Prompt};

#[tauri::command]
pub fn get_prompt_by_type(state: State<'_, DbState>, prompt_type: String) -> Result<Option<Prompt>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_prompt_by_type(&conn, &prompt_type).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_prompt_by_type(state: State<'_, DbState>, prompt_type: String, content: String) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::save_prompt_by_type(&conn, &prompt_type, &content).map_err(|e| e.to_string())
}
