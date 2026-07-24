use tauri::{
    menu::{Menu, MenuItem, Submenu},
    Runtime,
};

pub fn create_menu<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<Menu<R>> {
    //Define the individual Action items
    let quit_item = MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;
    //Build the subMenus
    let file_menu = Submenu::with_items(app, "File", true, &[&quit_item])?;

    //Map Tools Menu
    let map_import = MenuItem::with_id(app, "mapimport", "Import", true, None::<&str>)?;
    let map_menu = Submenu::with_items(app, "Map Tools", true, &[&map_import])?;

    //Assemble the Master Menu
    let main_menu = Menu::with_items(app, &[&file_menu, &map_menu])?;

    Ok(main_menu)
}
