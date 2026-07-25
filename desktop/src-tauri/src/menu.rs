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
    

    //Themes
    let theme_1 = MenuItem::with_id(app, "klokantech-basic", "Klokantech Basic (default)", true, None::<&str>)?;
    let theme_2 = MenuItem::with_id(app, "klokantech-3d", "Klokantech 3D", true, None::<&str>)?;
    let theme_3 = MenuItem::with_id(app, "osm-liberty", "OSM Liberty", true, None::<&str>)?;
    let theme_4 = MenuItem::with_id(app, "maptiler-basic", "Maptiler Basic", true, None::<&str>)?;
    let theme_5 = MenuItem::with_id(app, "maptiler-3d", "Maptiler 3D", true, None::<&str>)?;
    let theme_6 = MenuItem::with_id(app, "osm-bright", "OSM Bright", true, None::<&str>)?;
    let theme_7 = MenuItem::with_id(app, "toner", "Toner", true, None::<&str>)?;
    let theme_8 = MenuItem::with_id(app, "fiord-color", "Fiord Color", true, None::<&str>)?;
    let theme_9 = MenuItem::with_id(app, "dark-matter", "Dark Matter", true, None::<&str>)?;
    let theme_10 = MenuItem::with_id(app, "positron", "Positron", true, None::<&str>)?;
    let theme_menu = Submenu::with_items(app, "Themes", true, &[&theme_1, &theme_2, &theme_3, &theme_4, &theme_5, &theme_6, &theme_7, &theme_8, &theme_9, &theme_10])?;
    
    let map_menu = Submenu::with_items(app, "Map Tools", true, &[&map_import, &theme_menu])?;
    //Assemble the Master Menu
    let main_menu = Menu::with_items(app, &[&file_menu, &map_menu])?;

    Ok(main_menu)
}
