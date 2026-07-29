use osmpbfreader::{OsmPbfReader, OsmObj};
use petgraph::Graph;
use std::collections::{HashMap, HashSet};
use std::path::Path;
use tauri::{AppHandle, Emitter};
use rusqlite::Connection;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone, Copy, Debug)]
pub struct EdgeData {
    pub distance: f64,
    pub speed_mph: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RoutingGraph {
    pub graph: Graph<(f64, f64), EdgeData, petgraph::Undirected>,
    pub node_mapping: HashMap<i64, petgraph::graph::NodeIndex>,
}

fn parse_speed(maxspeed: &str, fallback: f64) -> f64 {
    let lower = maxspeed.to_lowercase();
    let mut num_str = String::new();
    for c in lower.chars() {
        if c.is_ascii_digit() || c == '.' {
            num_str.push(c);
        } else if !num_str.is_empty() {
            break;
        }
    }
    
    let speed = num_str.parse::<f64>().unwrap_or(fallback);
    
    // Convert km/h to mph if explicitly tagged
    if lower.contains("km/h") || lower.contains("kph") {
        speed * 0.621371
    } else {
        speed
    }
}

pub fn haversine(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let r = 3958.8; // Radius of Earth in miles
    let d_lat = (lat2 - lat1).to_radians();
    let d_lon = (lon2 - lon1).to_radians();
    let a = (d_lat / 2.0).sin().powi(2)
        + lat1.to_radians().cos() * lat2.to_radians().cos() * (d_lon / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
    r * c
}

fn get_grid_id(lat: f64, lon: f64) -> String {
    format!("{:.1}_{:.1}", lat, lon)
}

pub fn build_hierarchical_graph(app_handle: &AppHandle, pbf_path: &Path, output_dir: &Path, file_name: &str) -> Result<(), String> {
    println!("[Iter Viae Routing] Generating hierarchical 3-Tier spatial routing engine...");
    let _ = app_handle.emit("routing-progress", "Phase 1: Scanning road network...");
    
    let file = std::fs::File::open(&pbf_path).map_err(|e| e.to_string())?;
    let mut pbf = OsmPbfReader::new(file);

    // We will extract maxspeed out of tags, but we need to store it with the way.
    // For now, we will store a tuple of (Way, speed) in our tier lists.
    let mut tier1_ways = Vec::new();
    let mut tier2_ways = Vec::new();
    let mut tier3_ways = Vec::new();
    
    let mut all_highway_nodes = HashSet::new();

    for obj in pbf.iter().filter_map(Result::ok) {
        if let OsmObj::Way(way) = obj {
            if let Some(highway_type) = way.tags.get("highway") {
                let highway_type_str = highway_type.as_str();
                
                let maxspeed_str = way.tags.get("maxspeed").map(|s| s.as_str()).unwrap_or("");
                
                // Tier 1: Interstates / Motorways
                if highway_type_str == "motorway" || highway_type_str == "motorway_link" {
                    let speed = parse_speed(maxspeed_str, 65.0);
                    all_highway_nodes.extend(way.nodes.iter().map(|n| n.0));
                    tier1_ways.push((way, speed));
                } 
                // Tier 2: State / Federal Highways
                else if ["trunk", "trunk_link", "primary", "primary_link", "secondary", "secondary_link"].contains(&highway_type_str) {
                    let speed = parse_speed(maxspeed_str, if highway_type_str.contains("trunk") { 55.0 } else if highway_type_str.contains("primary") { 45.0 } else { 35.0 });
                    all_highway_nodes.extend(way.nodes.iter().map(|n| n.0));
                    tier2_ways.push((way, speed));
                }
                // Tier 3: Local / Residential
                else if ["tertiary", "residential", "unclassified", "service", "track"].contains(&highway_type_str) {
                    let speed = parse_speed(maxspeed_str, 25.0);
                    all_highway_nodes.extend(way.nodes.iter().map(|n| n.0));
                    tier3_ways.push((way, speed));
                }
            }
        }
    }

    let _ = app_handle.emit("routing-progress", "Phase 2: Extracting spatial coordinates...");
    
    let file = std::fs::File::open(&pbf_path).map_err(|e| e.to_string())?;
    let mut pbf = OsmPbfReader::new(file);
    let mut node_coords = HashMap::new();

    for obj in pbf.iter().filter_map(Result::ok) {
        if let OsmObj::Node(node) = obj {
            if all_highway_nodes.contains(&node.id.0) {
                let lat = node.decimicro_lat as f64 / 10_000_000.0;
                let lon = node.decimicro_lon as f64 / 10_000_000.0;
                node_coords.insert(node.id.0, (lat, lon));
            }
        }
    }

    let _ = app_handle.emit("routing-progress", "Phase 3: Compiling Tier 1 & 2 RAM Basemaps...");
    
    // Build Tier 1 & 2 Graph
    let mut basemap_graph = petgraph::Graph::<(f64, f64), EdgeData, petgraph::Undirected>::new_undirected();
    let mut basemap_mapping = HashMap::new();

    let combined_basemap_ways = tier1_ways.iter().chain(tier2_ways.iter());

    for (way, speed) in combined_basemap_ways {
        let mut prev_idx = None;
        for node_id in way.nodes.iter().map(|n| n.0) {
            if let Some(&(lat, lon)) = node_coords.get(&node_id) {
                let current_idx = *basemap_mapping.entry(node_id).or_insert_with(|| basemap_graph.add_node((lat, lon)));
                
                if let Some(prev) = prev_idx {
                    if let Some(&(prev_lat, prev_lon)) = basemap_graph.node_weight(prev) {
                        let distance = haversine(prev_lat, prev_lon, lat, lon);
                        basemap_graph.add_edge(prev, current_idx, EdgeData { distance, speed_mph: *speed });
                    }
                }
                prev_idx = Some(current_idx);
            }
        }
    }

    let basemap = RoutingGraph { graph: basemap_graph, node_mapping: basemap_mapping };
    let basemap_path = output_dir.join(format!("{}_basemap.bin", file_name));
    let encoded: Vec<u8> = bincode::serialize(&basemap).map_err(|e| e.to_string())?;
    std::fs::write(&basemap_path, encoded).map_err(|e| e.to_string())?;

    let _ = app_handle.emit("routing-progress", "Phase 4: Spatially Chunking Tier 3 Residential Streets...");
    
    let db_path = output_dir.join(format!("{}_routing.db", file_name));
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS routing_chunks (
            grid_id TEXT PRIMARY KEY,
            graph_data BLOB
        )",
        [],
    ).map_err(|e| e.to_string())?;

    // Group ways by grid
    let mut grid_ways: HashMap<String, Vec<&(osmpbfreader::Way, f64)>> = HashMap::new();
    for way_data in &tier3_ways {
        if let Some(first_node) = way_data.0.nodes.first() {
            if let Some(&(lat, lon)) = node_coords.get(&first_node.0) {
                let grid_id = get_grid_id(lat, lon);
                grid_ways.entry(grid_id).or_insert_with(Vec::new).push(way_data);
            }
        }
    }

    for (grid_id, ways) in grid_ways {
        let mut chunk_graph = petgraph::Graph::<(f64, f64), EdgeData, petgraph::Undirected>::new_undirected();
        let mut chunk_mapping = HashMap::new();

        for (way, speed) in ways {
            let mut prev_idx = None;
            for node_id in way.nodes.iter().map(|n| n.0) {
                if let Some(&(lat, lon)) = node_coords.get(&node_id) {
                    let current_idx = *chunk_mapping.entry(node_id).or_insert_with(|| chunk_graph.add_node((lat, lon)));
                    
                    if let Some(prev) = prev_idx {
                        if let Some(&(prev_lat, prev_lon)) = chunk_graph.node_weight(prev) {
                            let distance = haversine(prev_lat, prev_lon, lat, lon);
                            chunk_graph.add_edge(prev, current_idx, EdgeData { distance, speed_mph: *speed });
                        }
                    }
                    prev_idx = Some(current_idx);
                }
            }
        }
        
        let chunk = RoutingGraph { graph: chunk_graph, node_mapping: chunk_mapping };
        if let Ok(encoded_chunk) = bincode::serialize(&chunk) {
            let _ = conn.execute(
                "INSERT OR REPLACE INTO routing_chunks (grid_id, graph_data) VALUES (?1, ?2)",
                rusqlite::params![grid_id, encoded_chunk],
            );
        }
    }

    let _ = app_handle.emit("routing-progress", "3-Tier Routing Engine successfully compiled!");
    println!("[Iter Viae Routing] Successfully built 3-Tier hierarchical graph.");

    Ok(())
}
