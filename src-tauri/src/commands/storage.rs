use tauri_plugin_store::StoreBuilder;
use tauri::AppHandle;

const STORE_FILENAME: &str = "auth.json";

/// Get a value from the secure storage
#[tauri::command]
pub async fn storage_get(key: String, app: AppHandle) -> Result<Option<String>, String> {
    let store = StoreBuilder::new(&app, STORE_FILENAME).build()
        .map_err(|e| format!("Failed to open store: {}", e))?;

    match store.get(key.as_str()) {
        Some(value) => {
            // Try to convert to string
            if let Some(s) = value.as_str() {
                Ok(Some(s.to_string()))
            } else {
                // Try as other types and convert to string
                Ok(Some(value.to_string()))
            }
        }
        None => Ok(None)
    }
}

/// Set a value in the secure storage
#[tauri::command]
pub async fn storage_set(key: String, value: String, app: AppHandle) -> Result<(), String> {
    let store = StoreBuilder::new(&app, STORE_FILENAME).build()
        .map_err(|e| format!("Failed to open store: {}", e))?;

    // Set the value
    store.set(key.as_str(), value);
    store.save().map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

/// Remove a value from the secure storage
#[tauri::command]
pub async fn storage_remove(key: String, app: AppHandle) -> Result<(), String> {
    let store = StoreBuilder::new(&app, STORE_FILENAME).build()
        .map_err(|e| format!("Failed to open store: {}", e))?;

    // Delete the key
    store.delete(key.as_str());
    store.save().map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

/// Clear all values from the secure storage
#[tauri::command]
pub async fn storage_clear(app: AppHandle) -> Result<(), String> {
    let store = StoreBuilder::new(&app, STORE_FILENAME).build()
        .map_err(|e| format!("Failed to open store: {}", e))?;

    // Clear all keys
    store.clear();
    store.save().map_err(|e| format!("Failed to save store: {}", e))?;

    Ok(())
}

/// Get all keys from the secure storage
#[tauri::command]
pub async fn storage_keys(app: AppHandle) -> Result<Vec<String>, String> {
    let store = StoreBuilder::new(&app, STORE_FILENAME).build()
        .map_err(|e| format!("Failed to open store: {}", e))?;

    Ok(store.keys().into_iter().collect())
}
