use std::path::Path;
use tauri::{AppHandle, Manager, Emitter};
use std::fs;
use tauri_plugin_shell::ShellExt;
use rusqlite::Connection;
use osmpbfreader::{OsmPbfReader, OsmObj};

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

    // TRIGGER COMPILATION: Spawn the Tilemaker sidecar binary
    let file_name_str = destination_path
        .file_name()
        .unwrap()
        .to_string_lossy()
        .replace(".osm", "")
        .replace(".pbf", "");

    let mbtiles_path = maps_dir.join(format!("{}.mbtiles", file_name_str));

    // Resolve bundled configuration files
    let config_path = app_handle.path()
        .resolve("resources/config-openmaptiles.json", tauri::path::BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;
        
    let process_path = app_handle.path()
        .resolve("resources/process-openmaptiles.lua", tauri::path::BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;

    println!("[Iter Viae Sidecar] Spawning Tilemaker engine...");
    println!("[Iter Viae Sidecar] Input: {:?}", destination_path);
    println!("[Iter Viae Sidecar] Output: {:?}", mbtiles_path);

    // Spawn the bundled Tilemaker sidecar
    // We run it asynchronously. In a real app we'd stream stdout to the UI.
    let sidecar_command = app_handle.shell().sidecar("tilemaker")
        .map_err(|e| e.to_string())?
        .arg("--input")
        .arg(&destination_path)
        .arg("--output")
        .arg(&mbtiles_path)
        .arg("--config")
        .arg(&config_path)
        .arg("--process")
        .arg(&process_path);

    // Execute the sidecar process and wait for completion
    let output = sidecar_command.output().await.map_err(|e| e.to_string())?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Tilemaker execution failed: {}", err_msg));
    }

    println!("[Iter Viae Sidecar] Tilemaker successfully built the MBTiles database!");

    // Build native Gazetteer (Search Index)
    if let Err(e) = build_gazetteer(&app_handle, &destination_path, &maps_dir) {
        println!("[Iter Viae Gazetteer] Warning: Failed to build gazetteer: {}", e);
    }

    // Build Native Hierarchical Routing Graph
    if let Err(e) = crate::routing_builder::build_hierarchical_graph(&app_handle, &destination_path, &maps_dir, &file_name_str) {
        println!("[Iter Viae Routing] Warning: Failed to build routing graph: {}", e);
    }

    Ok(format!("Successfully built full map assets to: {:?}", maps_dir))
}

fn build_gazetteer(app_handle: &AppHandle, pbf_path: &Path, output_dir: &Path) -> Result<(), String> {
    println!("[Iter Viae Gazetteer] Parsing map archive natively...");
    let gazetteer_path = output_dir.join("geocoder.db");

    if gazetteer_path.exists() {
        let _ = fs::remove_file(&gazetteer_path);
    }
    
    let conn = Connection::open(&gazetteer_path).map_err(|e| format!("Failed to create Gazetteer DB: {}", e))?;
    conn.execute("CREATE TABLE places (id INTEGER PRIMARY KEY, name TEXT, category TEXT, lat REAL, lng REAL, rank INTEGER, tags TEXT);", []).map_err(|e| e.to_string())?;
    conn.execute("CREATE VIRTUAL TABLE places_fts USING fts5(name, content='places', content_rowid='id');", []).map_err(|e| e.to_string())?;

    let file = std::fs::File::open(&pbf_path).map_err(|e| e.to_string())?;
    let mut pbf = OsmPbfReader::new(file);
    
    conn.execute_batch("BEGIN TRANSACTION;").map_err(|e| e.to_string())?;

    let mut count = 0;
    for obj in pbf.iter().filter_map(Result::ok) {
        if let OsmObj::Node(node) = obj {
            if let Some(name) = node.tags.get("name") {
                let category = node.tags.get("place").or_else(|| node.tags.get("amenity")).map(|s| s.as_str()).unwrap_or("unknown");
                let lat = node.decimicro_lat as f64 / 10_000_000.0;
                let lon = node.decimicro_lon as f64 / 10_000_000.0;
                
                let mut tags_map = std::collections::HashMap::new();
                for (k, v) in node.tags.iter() {
                    tags_map.insert(k.as_str(), v.as_str());
                }
                let tags_json = serde_json::to_string(&tags_map).unwrap_or_else(|_| "{}".to_string());

                let _ = conn.execute(
                    "INSERT INTO places (id, name, category, lat, lng, rank, tags) VALUES (?1, ?2, ?3, ?4, ?5, 100, ?6);",
                    rusqlite::params![node.id.0, name.as_str(), category, lat, lon, tags_json],
                );
                
                let _ = conn.execute(
                    "INSERT INTO places_fts(rowid, name) VALUES (?1, ?2);",
                    rusqlite::params![node.id.0, name.as_str()],
                );
                
                count += 1;
                
                if count % 100_000 == 0 {
                    let _ = conn.execute_batch("COMMIT; BEGIN TRANSACTION;");
                    let _ = app_handle.emit("gazetteer-progress", format!("Indexed {} POIs...", count));
                }
            }
        }
    }
    
    conn.execute_batch("COMMIT;").map_err(|e| e.to_string())?;
    let _ = app_handle.emit("gazetteer-progress", format!("Finished! Indexed {} POIs.", count));
    println!("[Iter Viae Gazetteer] Native search index compiled with {} places.", count);

    Ok(())
}
