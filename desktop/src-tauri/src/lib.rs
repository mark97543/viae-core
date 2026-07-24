mod menu;
use tauri::{Emitter};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .setup(|app|{
            //Build and set the native menu useing modular file
            let menu = menu::create_menu(app.handle())?;
            app.set_menu(menu)?;

            //Listen for the menu item clickcs
            app.on_menu_event(|app_handle, event|{
                match event.id().as_ref(){
                    "quit"=>{
                        app_handle.exit(0);
                    }
                    "mapimport"=>{
                        //Send the signal to the front end 
                        let _ = app_handle.emit("navigate-to-view","map-loader");
                    }
                    _=>{}
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
