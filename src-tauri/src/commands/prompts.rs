use tauri::State;
use crate::db::{self, DbState, Prompt};
use crate::prompts::get_default_prompt;

#[tauri::command]
pub fn get_prompt_by_type(state: State<'_, DbState>, prompt_type: String, clerk_org_id: Option<String>) -> Result<Option<Prompt>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    let db_prompt = db::get_prompt_by_type(&conn, &prompt_type, org_id).map_err(|e| e.to_string())?;

    // If no prompt in database, return the default (if one exists for this type)
    match db_prompt {
        Some(prompt) => Ok(Some(prompt)),
        None => {
            // Return a synthetic Prompt with id=0 to indicate it's a default
            Ok(get_default_prompt(&prompt_type).map(|content| Prompt {
                id: 0,
                prompt_type: prompt_type.clone(),
                content: content.to_string(),
                created_at: 0,
                updated_at: 0,
                clerk_org_id: None,
            }))
        }
    }
}

#[tauri::command]
pub fn save_prompt_by_type(state: State<'_, DbState>, prompt_type: String, content: String, clerk_org_id: Option<String>) -> Result<i64, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let org_id = clerk_org_id.as_deref();
    db::save_prompt_by_type(&conn, &prompt_type, &content, org_id).map_err(|e| e.to_string())
}
