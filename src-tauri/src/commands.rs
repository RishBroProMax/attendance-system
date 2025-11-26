use tauri::AppHandle;
use crate::db;
use serde::{Deserialize, Serialize};
use rusqlite::OptionalExtension;
use uuid::Uuid;
use chrono::Timelike;

#[derive(Debug, Serialize, Deserialize)]
pub struct Member {
    id: String,
    name: Option<String>,
    role: String,
    prefect_number: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AttendanceRecord {
    id: String,
    member_id: String,
    date: String,
    timestamp: String,
    status: String,
    // Joined fields
    prefect_number: Option<String>,
    role: Option<String>,
}

#[tauri::command]
pub fn mark_attendance(app_handle: AppHandle, prefect_number: String, role: String) -> Result<AttendanceRecord, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;
    
    // 1. Find or create member
    let member_id: String = conn.query_row(
        "SELECT id FROM members WHERE prefect_number = ?1",
        [&prefect_number],
        |row| row.get(0),
    ).optional().map_err(|e| e.to_string())?
    .unwrap_or_else(|| {
        let new_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO members (id, role, prefect_number) VALUES (?1, ?2, ?3)",
            [&new_id, &role, &prefect_number],
        ).expect("Failed to create member");
        new_id
    });

    // 2. Check if already marked for today
    let date = chrono::Local::now().format("%Y-%m-%d").to_string();
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM attendance WHERE member_id = ?1 AND date = ?2)",
        [&member_id, &date],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    if exists {
        return Err(format!("Attendance already marked for {} today", prefect_number));
    }

    // 3. Insert attendance
    let id = Uuid::new_v4().to_string();
    let timestamp = chrono::Local::now().to_rfc3339();
    // Simple status logic: Late if after 7:00 AM
    let now = chrono::Local::now();
    let status = if now.hour() > 7 || (now.hour() == 7 && now.minute() > 0) {
        "Late"
    } else {
        "Present"
    };

    conn.execute(
        "INSERT INTO attendance (id, member_id, date, timestamp, status) VALUES (?1, ?2, ?3, ?4, ?5)",
        [&id, &member_id, &date, &timestamp, status],
    ).map_err(|e| e.to_string())?;

    Ok(AttendanceRecord {
        id,
        member_id,
        date,
        timestamp,
        status: status.to_string(),
        prefect_number: Some(prefect_number),
        role: Some(role),
    })
}

#[tauri::command]
pub fn get_attendance_by_date(app_handle: AppHandle, date: String) -> Result<Vec<AttendanceRecord>, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT a.id, a.member_id, a.date, a.timestamp, a.status, m.prefect_number, m.role 
         FROM attendance a 
         JOIN members m ON a.member_id = m.id 
         WHERE a.date = ?1"
    ).map_err(|e| e.to_string())?;

    let records = stmt.query_map([&date], |row| {
        Ok(AttendanceRecord {
            id: row.get(0)?,
            member_id: row.get(1)?,
            date: row.get(2)?,
            timestamp: row.get(3)?,
            status: row.get(4)?,
            prefect_number: row.get(5)?,
            role: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for record in records {
        result.push(record.map_err(|e| e.to_string())?);
    }
    
    Ok(result)
}

#[tauri::command]
pub fn get_all_attendance(app_handle: AppHandle) -> Result<Vec<AttendanceRecord>, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT a.id, a.member_id, a.date, a.timestamp, a.status, m.prefect_number, m.role 
         FROM attendance a 
         JOIN members m ON a.member_id = m.id"
    ).map_err(|e| e.to_string())?;

    let records = stmt.query_map([], |row| {
        Ok(AttendanceRecord {
            id: row.get(0)?,
            member_id: row.get(1)?,
            date: row.get(2)?,
            timestamp: row.get(3)?,
            status: row.get(4)?,
            prefect_number: row.get(5)?,
            role: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for record in records {
        result.push(record.map_err(|e| e.to_string())?);
    }
    
    Ok(result)
}

#[tauri::command]
pub fn get_member_list(app_handle: AppHandle) -> Result<Vec<Member>, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT id, name, role, prefect_number FROM members").map_err(|e| e.to_string())?;
    let members = stmt.query_map([], |row| {
        Ok(Member {
            id: row.get(0)?,
            name: row.get(1)?,
            role: row.get(2)?,
            prefect_number: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for member in members {
        result.push(member.map_err(|e| e.to_string())?);
    }
    
    Ok(result)
}

#[tauri::command]
pub fn create_member(app_handle: AppHandle, prefect_number: String, role: String, name: Option<String>) -> Result<String, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    
    conn.execute(
        "INSERT INTO members (id, prefect_number, role, name) VALUES (?1, ?2, ?3, ?4)",
        [&id, &prefect_number, &role, &name.unwrap_or_default()],
    ).map_err(|e| e.to_string())?;
    
    Ok(id)
}

#[tauri::command]
pub fn update_member(app_handle: AppHandle, id: String, prefect_number: Option<String>, role: Option<String>, name: Option<String>) -> Result<(), String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;
    
    if let Some(pn) = prefect_number {
        conn.execute("UPDATE members SET prefect_number = ?1 WHERE id = ?2", [&pn, &id]).map_err(|e| e.to_string())?;
    }
    if let Some(r) = role {
        conn.execute("UPDATE members SET role = ?1 WHERE id = ?2", [&r, &id]).map_err(|e| e.to_string())?;
    }
    if let Some(n) = name {
        conn.execute("UPDATE members SET name = ?1 WHERE id = ?2", [&n, &id]).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub fn delete_member(app_handle: AppHandle, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM members WHERE id = ?1", [&id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn export_backup(app_handle: AppHandle) -> Result<String, String> {
    // Basic implementation: dump DB to JSON or copy file
    // For now, let's just return the path to the DB file so frontend can download it?
    // Or better, read the file and return base64.
    let db_path = db::get_db_path(&app_handle).map_err(|e| e.to_string())?;
    let content = std::fs::read(db_path).map_err(|e| e.to_string())?;
    Ok(base64::encode(content))
}

#[tauri::command]
pub fn import_backup(app_handle: AppHandle, backup_data: String) -> Result<(), String> {
    let db_path = db::get_db_path(&app_handle).map_err(|e| e.to_string())?;
    let content = base64::decode(backup_data).map_err(|e| e.to_string())?;
    std::fs::write(db_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn wipe_all_data(app_handle: AppHandle) -> Result<(), String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM attendance", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM members", []).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_app_version(app_handle: AppHandle) -> String {
    app_handle.package_info().version.to_string()
}

#[tauri::command]
pub fn check_for_updates() -> Result<bool, String> {
    // Placeholder
    Ok(false)
}
