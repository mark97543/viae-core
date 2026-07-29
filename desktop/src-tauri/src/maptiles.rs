use std::path::PathBuf;
use std::fs;
use tauri::{AppHandle, Manager};
use rusqlite::{Connection, params, OptionalExtension};
use serde::{Serialize, Deserialize};

// Function to automatically find the local .mbtiles file and extract a single tile blob
pub fn fetch_local_tile(
    app_handle: &AppHandle,
    z: u32,
    x: u32,
    y: u32,
) -> Result<Vec<u8>, String> {
    // 1. Resolve the application's secure data directory
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let maps_dir = app_dir.join("maps");

    if !maps_dir.exists() {
        return Err(format!("Maps directory not found at: {:?}", maps_dir));
    }

    // 2. Automatically scan the maps folder to find the first available .mbtiles file
    let mut target_mbtiles: Option<PathBuf> = None;
    
    let entries = fs::read_dir(&maps_dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("mbtiles") {
            target_mbtiles = Some(path);
            break; // Grab the first valid map file found
        }
    }

    let db_path = target_mbtiles.ok_or_else(|| {
        format!("No .mbtiles map files found inside {:?}", maps_dir)
    })?;

    // 3. Open Connection to the SQLite .mbtiles container
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // Note: MBTiles use TMS coordinate systems for Y rows, 
    // so we convert standard XYZ web mapping row: let tms_y = (1 << z) - 1 - y;
    let tms_y = (1 << z) - 1 - y;

    let mut stmt = conn
        .prepare("SELECT tile_data FROM tiles WHERE zoom_level = ?1 AND tile_column = ?2 AND tile_row = ?3")
        .map_err(|e| e.to_string())?;

    // Handle missing tiles gracefully (e.g. empty oceans) by returning an empty vector instead of throwing an error
    let tile_data: Option<Vec<u8>> = stmt
        .query_row(params![z, x, tms_y], |row| row.get(0))
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(tile_data.unwrap_or_default())
}

//Function to pull map metadata
pub fn get_map_metadata(app_handle:&tauri::AppHandle)->Result <serde_json::Value,String>{
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let maps_dir = app_dir.join("maps");

    //scan for the active mdtile file just like done for tiles
    let mut target_mbtiles = None;
    if let Ok(entries) = std::fs::read_dir(&maps_dir){
        for entry in entries.flatten(){
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("mbtiles"){
                target_mbtiles = Some(path);
                break;
            }
        }
    }
    let db_path = target_mbtiles.ok_or("No mbtiles found")?;
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT name, value FROM metadata")
        .map_err(|e| e.to_string())?;
    
    let mut map_meta = serde_json::Map::new();
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;

    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let key: String = row.get(0).unwrap_or_default();
        let val: String = row.get(1).unwrap_or_default();
        map_meta.insert(key, serde_json::Value::String(val));
    }

    Ok(serde_json::Value::Object(map_meta))
}


//POI serch by lng and lat
#[derive(Serialize, Deserialize, Debug)]
pub struct PoiDetail {
    pub id: i64,
    pub name: String,
    pub category: Option<String>,
    pub lat: f64,
    pub lng: f64,
    pub rank: Option<i32>,
    pub tags: Option<String>,
}

pub fn find_poi_by_coords(
    app_handle: &tauri::AppHandle,
    target_lat: f64,
    target_lng: f64,
) -> Result<PoiDetail, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("maps").join("geocoder.db"); // Your local gazetteer file

    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // Use a wider tolerance bounding box (approx. ~500 meters) because mapbox vector tiles
    // quantize coordinates (shift them slightly) at lower zoom levels!
    let tolerance = 0.005; 

    let mut stmt = conn.prepare(
        "SELECT id, name, category, lat, lng, rank, tags,
         (ABS(lat - ?1) + ABS(lng - ?2)) as dist
         FROM places 
         WHERE lat BETWEEN ?3 AND ?4 AND lng BETWEEN ?5 AND ?6 
         ORDER BY dist ASC
         LIMIT 1"
    ).map_err(|e| e.to_string())?;

    let poi = stmt.query_row(
        params![
            target_lat,
            target_lng,
            target_lat - tolerance,
            target_lat + tolerance,
            target_lng - tolerance,
            target_lng + tolerance
        ],
        |row| {
            Ok(PoiDetail {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                lat: row.get(3)?,
                lng: row.get(4)?,
                rank: row.get(5)?,
                tags: row.get(6).unwrap_or(None),
            })
        },
    ).map_err(|e| format!("No matching POI found locally: {}", e))?;

    Ok(poi)
}

pub fn search_pois_by_category(
    app_handle: &tauri::AppHandle,
    category: &str,
) -> Result<Vec<PoiDetail>, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_dir.join("maps").join("geocoder.db");

    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, name, category, lat, lng, rank, tags
         FROM places 
         WHERE category = ?1"
    ).map_err(|e| e.to_string())?;

    let poi_iter = stmt.query_map([category], |row| {
        Ok(PoiDetail {
            id: row.get(0)?,
            name: row.get(1)?,
            category: row.get(2)?,
            lat: row.get(3)?,
            lng: row.get(4)?,
            rank: row.get(5)?,
            tags: row.get(6).unwrap_or(None),
        })
    }).map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for poi in poi_iter {
        results.push(poi.map_err(|e| e.to_string())?);
    }
    
    Ok(results)
}