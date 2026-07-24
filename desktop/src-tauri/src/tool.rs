use std::path::Path;

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