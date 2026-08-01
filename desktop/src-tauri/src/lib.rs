#[cfg(desktop)]
mod menu;
mod tool;
mod commands;
mod maptiles;
mod routing_builder;
mod routing;
mod usb_transfer;
use tauri::{Emitter, Manager};
use tauri_plugin_opener::OpenerExt;
use std::sync::Mutex;
use crate::routing::RoutingState;


#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }

    tauri::Builder::default()
        .manage(RoutingState {
            basemap: Mutex::new(None),
            db_path: Mutex::new(None),
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            tool::get_file_size,
            tool::import_map_file,
            crate::commands::get_map_tile,
            crate::commands::get_map_metadata,
            crate::commands::get_poi_details,
            crate::commands::search_pois_by_category,
            crate::commands::save_trip_file,
            crate::commands::load_trip_file,
            crate::commands::list_saved_trips,
            crate::routing::calculate_route,
            crate::routing::load_routing_graph,
            usb_transfer::detect_usb_devices,
            usb_transfer::push_map_to_device,
            usb_transfer::push_all_maps_to_device,
            usb_transfer::push_trips_to_device,
            usb_transfer::provision_head_unit
            ])
        .setup(|_app| {
            #[cfg(desktop)]
            {
                let menu = menu::create_menu(_app.handle())?;
                _app.set_menu(menu)?;

                _app.on_menu_event(move |app_handle, event| {
                    let id = event.id().as_ref();
                    match id {
                        "quit" => {
                            app_handle.exit(0);
                        }
                        "mapimport" => {
                            let _ = app_handle.emit("navigate-to-view", "map-loader");
                        }
                        "range_finder" => {
                            let _ = app_handle.emit("toggle-range-finder", ());
                        }
                        "newtrip" => {
                            let _ = app_handle.emit("new-trip", ());
                        }
                        "save" => {
                            let _ = app_handle.emit("save-trip", ());
                        }
                        "saveas" => {
                            let _ = app_handle.emit("save-as-trip", ());
                        }
                        "loadtrip" => {
                            let _ = app_handle.emit("load-trip", ());
                        }
                        "opentrips" => {
                            if let Ok(app_dir) = app_handle.path().app_data_dir() {
                                let trips_dir = app_dir.join("trips");
                                
                                if !trips_dir.exists() {
                                    let _ = std::fs::create_dir_all(&trips_dir);
                                }
                                
                                let _ = app_handle.opener().open_path(trips_dir.to_string_lossy().to_string(), None::<&str>);
                            }
                        }
                        "help_guide" => {
                            let _ = app_handle.emit("open-help-wiki", "guide");
                        }
                        "help_hotkeys" => {
                            let _ = app_handle.emit("open-help-wiki", "hotkeys");
                        }
                        "help_about" => {
                            let _ = app_handle.emit("open-help-wiki", "about");
                        }
                        "mobile_usb_sync" => {
                            let _ = app_handle.emit("open-mobile-sync", "sync");
                        }
                        "mobile_push_trips" => {
                            let _ = app_handle.emit("open-mobile-sync", "push_trips");
                        }
                        "mobile_provision" => {
                            let _ = app_handle.emit("open-mobile-sync", "provision");
                        }
                        _ => {
                            let themes = [
                                "klokantech-basic", "klokantech-3d", "osm-liberty", "maptiler-basic",
                                "maptiler-3d", "osm-bright", "toner", "fiord-color", "dark-matter", "positron"
                            ];
                            if themes.contains(&id) {
                                let _ = app_handle.emit("change-theme", id);
                            }
                        }
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
