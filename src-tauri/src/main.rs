// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;

use commands::*;

fn main() {
    // Initialize database
    if let Err(e) = db::init_db() {
        eprintln!("Failed to initialize database: {}", e);
        std::process::exit(1);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            mark_attendance,
            get_attendance_by_date,
            get_member_list,
            create_member,
            update_member,
            delete_member,
            export_backup,
            import_backup,
            wipe_all_data,
            get_app_version,
            check_for_updates,
            get_all_attendance
        ])
        .setup(|_app| {
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
