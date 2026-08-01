// src-tauri/src/commands.rs
use tauri::{AppHandle, Manager};

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

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct TripFileInfo {
    pub name: String,
    pub filename: String,
    pub path: String,
    pub waypoint_count: usize,
}

#[tauri::command]
pub fn list_saved_trips(app_handle: AppHandle) -> Result<Vec<TripFileInfo>, String> {
    let mut candidate_dirs = Vec::new();

    if let Ok(app_dir) = app_handle.path().app_data_dir() {
        let trips_dir = app_dir.join("trips");
        let _ = std::fs::create_dir_all(&trips_dir);
        candidate_dirs.push(trips_dir);
        candidate_dirs.push(app_dir);
    }

    candidate_dirs.push(std::path::PathBuf::from("/sdcard/IterViaeNavus/trips"));
    candidate_dirs.push(std::path::PathBuf::from("/sdcard/IterViaeNavus"));
    candidate_dirs.push(std::path::PathBuf::from("/storage/emulated/0/IterViaeNavus/trips"));
    candidate_dirs.push(std::path::PathBuf::from("/storage/emulated/0/IterViaeNavus"));
    candidate_dirs.push(std::path::PathBuf::from("/storage/emulated/0/Android/data/com.viae/files/trips"));
    candidate_dirs.push(std::path::PathBuf::from("/storage/emulated/0/Android/data/com.viae/files"));
    candidate_dirs.push(std::path::PathBuf::from("/data/data/com.viae/files/trips"));
    candidate_dirs.push(std::path::PathBuf::from("/data/data/com.viae/files"));

    let mut trip_files = Vec::new();

    for dir in candidate_dirs {
        if dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let ext = path.extension().map(|s| s.to_string_lossy().to_lowercase());
                    if ext.as_deref() == Some("json") {
                        let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                        let mut name = filename.clone();
                        let mut waypoint_count = 0;

                        if let Ok(content) = std::fs::read_to_string(&path) {
                            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                                if let Some(n) = val.get("tripData").and_then(|td| td.get("name")).and_then(|n| n.as_str()) {
                                    name = n.to_string();
                                }
                                if let Some(wps) = val.get("waypoints").and_then(|w| w.as_array()) {
                                    waypoint_count = wps.len();
                                }
                            }
                        }

                        if !trip_files.iter().any(|t: &TripFileInfo| t.filename == filename) {
                            trip_files.push(TripFileInfo {
                                name,
                                filename,
                                path: path.to_string_lossy().to_string(),
                                waypoint_count,
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(trip_files)
}