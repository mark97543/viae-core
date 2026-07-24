use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use std::fs;

//Function to send file metadata back
#[tauri::command]
pub fn get_file_size(file_path:String)->Result<String, String>{
    let path = Path::new(&file_path);
    
    //Check if File Exists on Disk
    if !path.exists(){
        return Err("File not found on Disk".to_string());
    }

    //Pull the Raw file size in bytes useing system emtadata
    let metadata = std::fs::metadata(path).map_err(|e| e.to_string())?;
    let bytes = metadata.len();

    //convert bytes into Megabytes with one decimal place
    let size_mb = bytes as f64 / (1024.0 * 1024.0);

    Ok(format!( "{size_mb:.1} MB"))
}

//Import Map File
#[tauri::command]
pub async fn import_map_file(app_handle:AppHandle, file_path:String)->Result<String, String>{
    //Resolve the secure local application data directory
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let maps_dir = app_dir.join("maps");

    //Purge folder if exist if not create folder
    if maps_dir.exists() {
        // Read through entries and remove them to enforce single-map storage
        if let Ok(entries) = fs::read_dir(&maps_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let _ = fs::remove_file(&path);
                } else if path.is_dir() {
                    let _ = fs::remove_dir_all(&path);
                }
            }
        }
    } else {
        // Otherwise, create the maps directory fresh
        fs::create_dir_all(&maps_dir).map_err(|e| e.to_string())?;
    }

    //Extract the filename from the chosen path
    let source_path = Path::new(&file_path);
    let file_name = source_path
        .file_name()
        .ok_or_else(|| "Invalid file name".to_string())?;
    
    let destination_path = maps_dir.join(file_name);

    //Copy the file into the local application
    std::fs::copy(source_path, &destination_path).map_err(|e| e.to_string())?;

    Ok(format!("Successfully imported map to: {:?}", destination_path))
}