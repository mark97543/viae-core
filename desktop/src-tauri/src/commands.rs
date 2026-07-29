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

#[tauri::command]
pub async fn get_poi_details(
    app_handle: tauri::AppHandle,
    lat: f64,
    lng: f64,
) -> Result<crate::maptiles::PoiDetail, String> {
    crate::maptiles::find_poi_by_coords(&app_handle, lat, lng)
}

#[tauri::command]
pub async fn search_pois_by_category(
    app_handle: tauri::AppHandle,
    category: String,
) -> Result<Vec<crate::maptiles::PoiDetail>, String> {
    crate::maptiles::search_pois_by_category(&app_handle, &category)
}

//Save Trip
#[tauri::command]
pub fn save_trip_file(path: String, contents: String) -> Result<(), String> {
    
    // 1. Get the parent directory from the file path
    if let Some(parent) = std::path::Path::new(&path).parent() {
        // 2. If the folder doesn't exist, create it (and any missing parent folders above it)
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    
    // 3. Write the file safely knowing the folder exists!
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

//Load Trip
#[tauri::command]
pub fn load_trip_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}