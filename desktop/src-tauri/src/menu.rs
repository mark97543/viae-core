use tauri::{
    menu::{Menu, MenuItem, Submenu, PredefinedMenuItem},
    Runtime,
};

pub fn create_menu<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<Menu<R>> {
    let new_trip = MenuItem::with_id(app, "newtrip", "New Trip", true, Some("CmdOrCtrl+N"))?;
    let load_trip = MenuItem::with_id(app, "loadtrip", "Load Trip...", true, Some("CmdOrCtrl+O"))?;
    let save_trip = MenuItem::with_id(app, "save", "Save Trip", true, Some("CmdOrCtrl+S"))?;
    let save_as_trip = MenuItem::with_id(app, "saveas", "Save Trip As...", true, Some("CmdOrCtrl+Shift+S"))?;
    let open_trips = MenuItem::with_id(app, "opentrips", "Open Trips Folder", true, None::<&str>)?;
    
    let separator = PredefinedMenuItem::separator(app)?;
    
    let quit_item = MenuItem::with_id(app, "quit", "Exit", true, Some("CmdOrCtrl+Q"))?;
    
    //Build the subMenus
    let file_menu = Submenu::with_items(app, "File", true, &[
        &new_trip, &load_trip, &save_trip, &save_as_trip, &open_trips, &separator, &quit_item
    ])?;

    //Map Tools Menu
    let map_import = MenuItem::with_id(app, "mapimport", "Import", true, None::<&str>)?;
    let range_finder = MenuItem::with_id(app, "range_finder", "Range Finder", true, None::<&str>)?;
    

    //Themes
    let theme_1 = MenuItem::with_id(app, "klokantech-basic", "Klokantech Basic ", true, None::<&str>)?;
    let theme_2 = MenuItem::with_id(app, "klokantech-3d", "Klokantech 3D", true, None::<&str>)?;
    let theme_3 = MenuItem::with_id(app, "osm-liberty", "OSM Liberty", true, None::<&str>)?;
    let theme_4 = MenuItem::with_id(app, "maptiler-basic", "Maptiler Basic", true, None::<&str>)?;
    let theme_5 = MenuItem::with_id(app, "maptiler-3d", "Maptiler 3D", true, None::<&str>)?;
    let theme_6 = MenuItem::with_id(app, "osm-bright", "OSM Bright (Default)", true, None::<&str>)?;
    let theme_7 = MenuItem::with_id(app, "toner", "Toner", true, None::<&str>)?;
    let theme_8 = MenuItem::with_id(app, "fiord-color", "Fiord Color", true, None::<&str>)?;
    let theme_9 = MenuItem::with_id(app, "dark-matter", "Dark Matter", true, None::<&str>)?;
    let theme_10 = MenuItem::with_id(app, "positron", "Positron", true, None::<&str>)?;
    let theme_menu = Submenu::with_items(app, "Themes", true, &[&theme_1, &theme_2, &theme_3, &theme_4, &theme_5, &theme_6, &theme_7, &theme_8, &theme_9, &theme_10])?;
    
    let map_menu = Submenu::with_items(app, "Map Tools", true, &[&map_import, &range_finder, &theme_menu])?;

    // Help Menu
    let user_guide = MenuItem::with_id(app, "help_guide", "User Guide & Wiki", true, Some("F1"))?;
    let hotkeys = MenuItem::with_id(app, "help_hotkeys", "Keyboard Shortcuts", true, Some("CmdOrCtrl+/"))?;
    let about = MenuItem::with_id(app, "help_about", "About Iter Viae", true, None::<&str>)?;
    let help_menu = Submenu::with_items(app, "Help", true, &[&user_guide, &hotkeys, &about])?;

    //Assemble the Master Menu
    let main_menu = Menu::with_items(app, &[&file_menu, &map_menu, &help_menu])?;

    Ok(main_menu)
}
