mod menu;
mod tool;
mod commands;
mod maptiles;
use tauri::Emitter;


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
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            tool::get_file_size,
            tool::import_map_file,
            crate::commands::get_map_tile,
            crate::commands::get_map_metadata,
            crate::commands::get_poi_details
            ])
        .setup(|app| {
            //Build and set the native menu useing modular file
            let menu = menu::create_menu(app.handle())?;
            app.set_menu(menu)?;

            //Listen for the menu item clickcs
            app.on_menu_event(|app_handle, event| {
                let id = event.id().as_ref();
                match id {
                    "quit" => {
                        app_handle.exit(0);
                    }
                    "mapimport" => {
                        //Send the signal to the front end
                        let _ = app_handle.emit("navigate-to-view", "map-loader");
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
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
