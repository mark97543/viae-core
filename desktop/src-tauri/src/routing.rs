use serde::{Serialize, Deserialize};
use std::collections::{HashMap, BinaryHeap};
use std::sync::Mutex;
use tauri::{State, Manager};
use petgraph::Graph;
use petgraph::visit::EdgeRef;
use std::cmp::Ordering;
use rusqlite::Connection;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EdgeData {
    pub distance: f64,
    pub speed_mph: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RoutingGraph {
    pub graph: Graph<(f64, f64), EdgeData, petgraph::Undirected>,
    pub node_mapping: HashMap<i64, petgraph::graph::NodeIndex>,
}

pub struct RoutingState {
    pub basemap: Mutex<Option<RoutingGraph>>,
    pub db_path: Mutex<Option<String>>,
}

#[derive(Copy, Clone, PartialEq)]
struct StateNode {
    cost: f64,
    node: petgraph::graph::NodeIndex,
}

impl Eq for StateNode {}

impl Ord for StateNode {
    fn cmp(&self, other: &Self) -> Ordering {
        other.cost.partial_cmp(&self.cost).unwrap_or(Ordering::Equal)
    }
}

impl PartialOrd for StateNode {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

// Haversine distance
fn haversine(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let r = 3958.8; // miles
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

fn load_chunk_from_db(db_path: &str, grid_id: &str) -> Option<RoutingGraph> {
    let conn = Connection::open(db_path).ok()?;
    let mut stmt = conn.prepare("SELECT graph_data FROM routing_chunks WHERE grid_id = ?1").ok()?;
    
    let mut rows = stmt.query(rusqlite::params![grid_id]).ok()?;
    if let Some(row) = rows.next().ok().flatten() {
        let blob: Vec<u8> = row.get(0).ok()?;
        if let Ok(graph) = bincode::deserialize(&blob) {
            return Some(graph);
        }
    }
    None
}

// This function merges a chunk into the active graph mathematically by linking shared OSM Node IDs
fn merge_chunk_into_graph(active_graph: &mut RoutingGraph, chunk: &RoutingGraph) {
    let mut chunk_to_active_mapping: HashMap<petgraph::graph::NodeIndex, petgraph::graph::NodeIndex> = HashMap::new();

    // Pass 1: Nodes
    for (&osm_id, &chunk_node_idx) in &chunk.node_mapping {
        // Does this OSM ID already exist in our active graph? (e.g. a highway exit)
        if let Some(&active_node_idx) = active_graph.node_mapping.get(&osm_id) {
            // It exists! We mathematically fuse them by recording the mapping
            chunk_to_active_mapping.insert(chunk_node_idx, active_node_idx);
        } else {
            // It's a brand new residential node. Add it to the active graph.
            if let Some(&(lat, lon)) = chunk.graph.node_weight(chunk_node_idx) {
                let new_active_idx = active_graph.graph.add_node((lat, lon));
                active_graph.node_mapping.insert(osm_id, new_active_idx);
                chunk_to_active_mapping.insert(chunk_node_idx, new_active_idx);
            }
        }
    }

    // Pass 2: Edges
    for edge in chunk.graph.edge_indices() {
        if let Some((source_chunk_idx, target_chunk_idx)) = chunk.graph.edge_endpoints(edge) {
            if let Some(weight) = chunk.graph.edge_weight(edge) {
                if let (Some(&active_source), Some(&active_target)) = (
                    chunk_to_active_mapping.get(&source_chunk_idx),
                    chunk_to_active_mapping.get(&target_chunk_idx)
                ) {
                    // Check if edge already exists to prevent duplicate lines
                    if active_graph.graph.find_edge(active_source, active_target).is_none() {
                        active_graph.graph.add_edge(active_source, active_target, weight.clone());
                    }
                }
            }
        }
    }
}

fn find_closest_node(graph: &RoutingGraph, target_lat: f64, target_lon: f64) -> Option<petgraph::graph::NodeIndex> {
    let mut closest_node = None;
    let mut min_distance = f64::MAX;

    // First try: Only snap to highly connected nodes (>= 2 edges) to avoid dead ends and islands
    for node in graph.graph.node_indices() {
        if graph.graph.edges(node).count() >= 2 {
            if let Some(&(lat, lon)) = graph.graph.node_weight(node) {
                let dist = haversine(lat, lon, target_lat, target_lon);
                if dist < min_distance {
                    min_distance = dist;
                    closest_node = Some(node);
                }
            }
        }
    }
    
    // Fallback: if no highly connected nodes exist (unlikely), try any connected node
    if closest_node.is_none() {
        min_distance = f64::MAX;
        for node in graph.graph.node_indices() {
            if graph.graph.edges(node).count() >= 1 {
                if let Some(&(lat, lon)) = graph.graph.node_weight(node) {
                    let dist = haversine(lat, lon, target_lat, target_lon);
                    if dist < min_distance {
                        min_distance = dist;
                        closest_node = Some(node);
                    }
                }
            }
        }
    }
    
    closest_node
}

#[tauri::command]
pub fn calculate_route(
    app_handle: tauri::AppHandle, lat1: f64, lng1: f64, lat2: f64, lng2: f64, avoid_highways: Option<bool>, state: State<RoutingState>
) -> Result<serde_json::Value, String> {
    
    // Auto-arm the routing engine if it hasn't been loaded yet!
    let needs_init = {
        let basemap_guard = state.basemap.lock().unwrap();
        basemap_guard.is_none()
    };

    if needs_init {
        println!("[Iter Viae Routing] Auto-arming routing engine before calculation...");
        if let Err(e) = load_routing_graph(app_handle.clone(), state.clone()) {
            return Err(format!("Failed to arm routing engine: {}", e));
        }
    }

    let basemap_guard = state.basemap.lock().unwrap();
    let db_path_guard = state.db_path.lock().unwrap();
    
    if basemap_guard.is_none() || db_path_guard.is_none() {
        return Err("Routing engine not initialized. Please load a map first.".into());
    }

    let basemap = basemap_guard.as_ref().unwrap();
    let db_path = db_path_guard.as_ref().unwrap();
    let avoid = avoid_highways.unwrap_or(false);

    println!("[Iter Viae Routing] Calculating route from ({}, {}) to ({}, {}). Avoid highways: {}", lat1, lng1, lat2, lng2, avoid);

    // 1. Get the Departure Grid
    let start_grid = get_grid_id(lat1, lng1);
    let dest_grid = get_grid_id(lat2, lng2);

    // Load Tier 3 Start and End Chunks
    let start_chunk = load_chunk_from_db(db_path, &start_grid);
    let dest_chunk = load_chunk_from_db(db_path, &dest_grid);

    // We will build a unified temporary graph that combines the basemap + start chunk + end chunk
    let mut active_graph = basemap.clone();
    
    // Dynamically stitch the Tier 3 chunks into our active graph on the fly!
    if let Some(chunk) = start_chunk {
        println!("[Iter Viae Routing] Stitching Departure Chunk into active graph...");
        merge_chunk_into_graph(&mut active_graph, &chunk);
    }
    
    if let Some(chunk) = dest_chunk {
        // Prevent duplicate merging if start and dest are in the exact same 11km chunk
        if start_grid != dest_grid {
            println!("[Iter Viae Routing] Stitching Arrival Chunk into active graph...");
            merge_chunk_into_graph(&mut active_graph, &chunk);
        }
    }

    let start_node = find_closest_node(&active_graph, lat1, lng1).ok_or("Start point not near any road")?;
    let end_node = find_closest_node(&active_graph, lat2, lng2).ok_or("End point not near any road")?;

    // The A* Algorithm now optimizes for TIME (seconds) instead of distance!
    let mut distances: HashMap<petgraph::graph::NodeIndex, f64> = HashMap::new(); // g_cost (Time in seconds)
    let mut heap = BinaryHeap::new();
    let mut came_from: HashMap<petgraph::graph::NodeIndex, (petgraph::graph::NodeIndex, f64, f64)> = HashMap::new(); // (prev_node, edge_distance, edge_time)

    distances.insert(start_node, 0.0);
    heap.push(StateNode { cost: 0.0, node: start_node });

    let mut found = false;

    while let Some(StateNode { cost: _, node }) = heap.pop() {
        if node == end_node {
            found = true;
            break;
        }

        // Get the actual g_cost from our distances map!
        let g_cost = *distances.get(&node).unwrap_or(&f64::MAX);

        for edge in active_graph.graph.edges(node) {
            let next = if edge.source() == node { edge.target() } else { edge.source() };
            let weight = edge.weight();
            
            // Time = (Distance in miles / Speed in mph) * 3600 seconds
            let edge_time = (weight.distance / weight.speed_mph) * 3600.0;
            let next_cost = g_cost + edge_time;

            if next_cost < *distances.get(&next).unwrap_or(&f64::MAX) {
                distances.insert(next, next_cost);
                came_from.insert(next, (node, weight.distance, edge_time));
                
                // Heuristic: Straight-line distance to end node / max highway speed (65mph) in seconds
                if let (Some(&(n_lat, n_lon)), Some(&(e_lat, e_lon))) = (active_graph.graph.node_weight(next), active_graph.graph.node_weight(end_node)) {
                    let h_dist = haversine(n_lat, n_lon, e_lat, e_lon);
                    let h_time = (h_dist / 65.0) * 3600.0;
                    heap.push(StateNode { cost: next_cost + h_time, node: next });
                }
            }
        }
    }

    if !found {
        return Err("No route could be found between these points.".into());
    }

    // Reconstruct path
    let mut path = Vec::new();
    let mut total_distance = 0.0;
    let mut total_time = 0.0;
    let mut curr = end_node;

    while curr != start_node {
        if let Some(&(lat, lon)) = active_graph.graph.node_weight(curr) {
            path.push(vec![lon, lat]);
        }
        if let Some(&(prev, edge_dist, edge_time)) = came_from.get(&curr) {
            total_distance += edge_dist;
            total_time += edge_time;
            curr = prev;
        } else {
            break;
        }
    }
    
    if let Some(&(lat, lon)) = active_graph.graph.node_weight(start_node) {
        path.push(vec![lon, lat]);
    }
    
    path.reverse();

    Ok(serde_json::json!({
        "geometry": {
            "type": "LineString",
            "coordinates": path
        },
        "distance": total_distance,
        "duration": total_time
    }))
}

use std::path::PathBuf;

#[tauri::command]
pub fn load_routing_graph(app_handle: tauri::AppHandle, state: State<RoutingState>) -> Result<String, String> {
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let maps_dir = app_dir.join("maps");

    if !maps_dir.exists() {
        return Err("Maps directory not found.".into());
    }

    let mut target_basemap: Option<PathBuf> = None;
    let mut target_db: Option<PathBuf> = None;

    let entries = std::fs::read_dir(&maps_dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.ends_with("_basemap.bin") {
                target_basemap = Some(path.clone());
            } else if name.ends_with("_routing.db") {
                target_db = Some(path.clone());
            }
        }
    }

    let basemap_path = target_basemap.ok_or_else(|| "No routing basemap found. Please import a map.".to_string())?;
    let db_path = target_db.ok_or_else(|| "No routing chunk database found. Please import a map.".to_string())?;

    println!("[Iter Viae Routing] Loading 3-Tier engine. Basemap: {:?}", basemap_path);

    if basemap_path.exists() {
        let data = std::fs::read(&basemap_path).map_err(|e| e.to_string())?;
        let graph: RoutingGraph = bincode::deserialize(&data).map_err(|e| e.to_string())?;
        
        let mut basemap_guard = state.basemap.lock().unwrap();
        *basemap_guard = Some(graph);
        
        let mut db_guard = state.db_path.lock().unwrap();
        *db_guard = Some(db_path.to_string_lossy().to_string());
        
        Ok("3-Tier engine armed!".into())
    } else {
        Err("No offline routing data found for this map.".into())
    }
}
