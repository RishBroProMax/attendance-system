mod db;
mod commands;

use chrono::Timelike; // Needed for hour()/minute() in commands

fn main() {
  tauri::Builder::default()
    .setup(|app| {
        db::init_db(app.handle()).expect("Failed to initialize database");
        Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        commands::mark_attendance,
        commands::get_attendance_by_date,
        commands::get_all_attendance,
        commands::get_member_list,
        commands::create_member,
        commands::update_member,
        commands::delete_member,
        commands::export_backup,
        commands::import_backup,
        commands::wipe_all_data,
        commands::get_app_version,
        commands::check_for_updates
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
