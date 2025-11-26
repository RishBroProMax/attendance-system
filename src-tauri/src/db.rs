use rusqlite::{Connection, Result};
use std::path::PathBuf;
use tauri::AppHandle;
use std::fs;

pub fn get_db_path(app_handle: &AppHandle) -> Result<PathBuf> {
    let app_dir = app_handle.path_resolver().app_data_dir().ok_or_else(|| {
        rusqlite::Error::InvalidPath(PathBuf::from("App data dir not found"))
    })?;
    
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|_| {
            rusqlite::Error::InvalidPath(app_dir.clone())
        })?;
    }
    
    Ok(app_dir.join("attendance.db"))
}

pub fn init_db(app_handle: &AppHandle) -> Result<()> {
    let db_path = get_db_path(app_handle)?;
    let conn = Connection::open(db_path)?;

    // Enable WAL mode for better concurrency
    conn.execute_batch("PRAGMA journal_mode = WAL;")?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS members (
            id TEXT PRIMARY KEY,
            name TEXT,
            role TEXT NOT NULL,
            prefect_number TEXT UNIQUE NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS attendance (
            id TEXT PRIMARY KEY,
            member_id TEXT NOT NULL,
            date TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            status TEXT NOT NULL,
            FOREIGN KEY(member_id) REFERENCES members(id)
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS backups (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            path TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;

    Ok(())
}

pub fn get_connection(app_handle: &AppHandle) -> Result<Connection> {
    let db_path = get_db_path(app_handle)?;
    Connection::open(db_path)
}
