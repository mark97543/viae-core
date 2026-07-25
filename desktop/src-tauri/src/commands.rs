// src-tauri/src/commands.rs
use tauri::AppHandle;

#[tauri::command]
pub async fn get_map_tile(
    app_handle: AppHandle,
    z: u32,
    x: u32,
    y: u32,
) -> Result<Vec<u8>, String> {
    crate::maptiles::fetch_local_tile(&app_handle, z, x, y)
}

#[tauri::command]
pub async fn get_map_metadata(
    app_handle: AppHandle
) -> Result<serde_json::Value, String> {
    crate::maptiles::get_map_metadata(&app_handle)
}