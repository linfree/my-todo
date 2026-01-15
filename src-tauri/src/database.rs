use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::io::{self, Read, Write};
use std::pin::Pin;
use std::task::{Context, Poll};
use tauri::AppHandle;
use tauri::Manager;

// 任务数据结构
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub completed: bool,
    pub priority: String,
    pub status: String,
    #[serde(alias = "list_id")]
    pub list_id: String,
    pub tags: String,
    #[serde(alias = "sub_tasks")]
    pub sub_tasks: String,
    pub reminders: String,
    #[serde(alias = "due_date")]
    pub due_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub order: i32,
}

// 清单数据结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskList {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub order: i32,
    pub created_at: String,
}

// （已移除 PostgreSQL 支持，仅保留 SQLite）

// ========== SQLite 实现 ==========

// 数据库路径
fn get_sqlite_db_path(handle: &AppHandle) -> PathBuf {
    let app_dir = handle.path().app_data_dir().expect("Failed to get app data dir");
    fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
    app_dir.join("todo.db")
}

// 使用 rusqlite 进行数据库操作
#[cfg(feature = "sqlite")]
use rusqlite::{Connection, params};

// SQLite 初始化
#[cfg(feature = "sqlite")]
pub fn init_sqlite_database(handle: &AppHandle) -> Result<(), String> {
    let db_path = get_sqlite_db_path(handle);
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    // 创建任务表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            completed INTEGER NOT NULL DEFAULT 0,
            priority TEXT NOT NULL DEFAULT 'none',
            status TEXT NOT NULL DEFAULT 'todo',
            list_id TEXT NOT NULL,
            tags TEXT NOT NULL DEFAULT '[]',
            sub_tasks TEXT NOT NULL DEFAULT '[]',
            reminders TEXT NOT NULL DEFAULT '[]',
            due_date TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            \"order\" INTEGER NOT NULL DEFAULT 0
        )",
        [],
    ).map_err(|e| format!("Failed to create tasks table: {}", e))?;

    // 创建清单表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS lists (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT,
            color TEXT,
            \"order\" INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )",
        [],
    ).map_err(|e| format!("Failed to create lists table: {}", e))?;

    // 创建已发送提醒记录表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sent_reminders (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            reminder_time INTEGER NOT NULL,
            sent_at INTEGER NOT NULL,
            reminder_data TEXT
        )",
        [],
    ).map_err(|e| format!("Failed to create sent_reminders table: {}", e))?;

    // 创建索引以提高查询性能
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sent_reminders_task_id ON sent_reminders(task_id)",
        [],
    ).map_err(|e| format!("Failed to create index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sent_reminders_time ON sent_reminders(reminder_time)",
        [],
    ).map_err(|e| format!("Failed to create index: {}", e))?;

    // 插入默认清单
    let now = chrono::Utc::now().to_rfc3339();
    let default_lists: Vec<(&str, &str, Option<&str>, Option<&str>, i32)> = vec![
        ("all", "全部", Some("Inbox"), None, 0),
        ("today", "今天", Some("Sun"), None, 1),
        ("week", "最近7天", Some("Calendar"), None, 2),
    ];

    for (id, name, icon, color, order) in default_lists {
        conn.execute(
            "INSERT OR IGNORE INTO lists (id, name, icon, color, \"order\", created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, name, icon, color, order, now],
        ).map_err(|e| format!("Failed to insert default list: {}", e))?;
    }

    Ok(())
}

// SQLite 获取所有任务
#[cfg(feature = "sqlite")]
pub fn get_sqlite_tasks(handle: &AppHandle) -> Result<Vec<Task>, String> {
    let db_path = get_sqlite_db_path(handle);
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn.prepare("SELECT * FROM tasks ORDER BY \"order\" ASC, created_at DESC")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let tasks = stmt.query_map([], |row| {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            completed: row.get::<_, i32>(3)? != 0,
            priority: row.get(4)?,
            status: row.get(5)?,
            list_id: row.get(6)?,
            tags: row.get(7)?,
            sub_tasks: row.get(8)?,
            reminders: row.get(9)?,
            due_date: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
            order: row.get(13)?,
        })
    })
    .map_err(|e| format!("Failed to query tasks: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect tasks: {}", e))?;

    Ok(tasks)
}

// SQLite 保存任务
#[cfg(feature = "sqlite")]
pub fn save_sqlite_task(handle: &AppHandle, task: &Task) -> Result<(), String> {
    let db_path = get_sqlite_db_path(handle);
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute(
        "INSERT OR REPLACE INTO tasks (id, title, description, completed, priority, status, list_id, tags, sub_tasks, reminders, due_date, created_at, updated_at, \"order\") VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            task.id,
            task.title,
            task.description,
            task.completed as i32,
            task.priority,
            task.status,
            task.list_id,
            task.tags,
            task.sub_tasks,
            task.reminders,
            task.due_date,
            task.created_at,
            task.updated_at,
            task.order,
        ],
    ).map_err(|e| format!("Failed to save task: {}", e))?;

    Ok(())
}

// SQLite 删除任务
#[cfg(feature = "sqlite")]
pub fn delete_sqlite_task(handle: &AppHandle, id: &str) -> Result<(), String> {
    let db_path = get_sqlite_db_path(handle);
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete task: {}", e))?;

    // 同时删除相关的提醒记录
    delete_sqlite_task_reminders(handle, id)?;

    Ok(())
}

// SQLite 获取所有清单
#[cfg(feature = "sqlite")]
pub fn get_sqlite_lists(handle: &AppHandle) -> Result<Vec<TaskList>, String> {
    let db_path = get_sqlite_db_path(handle);
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn.prepare("SELECT * FROM lists ORDER BY \"order\" ASC")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let lists = stmt.query_map([], |row| {
        Ok(TaskList {
            id: row.get(0)?,
            name: row.get(1)?,
            icon: row.get(2)?,
            color: row.get(3)?,
            order: row.get(4)?,
            created_at: row.get(5)?,
        })
    })
    .map_err(|e| format!("Failed to query lists: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect lists: {}", e))?;

    Ok(lists)
}

// SQLite 提醒记录相关函数
#[cfg(feature = "sqlite")]
pub fn is_sqlite_reminder_sent(handle: &AppHandle, task_id: &str, reminder_time: i64) -> Result<bool, String> {
    let db_path = get_sqlite_db_path(handle);
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn.prepare("SELECT COUNT(*) FROM sent_reminders WHERE task_id = ?1 AND reminder_time = ?2")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let count: i64 = stmt.query_row(params![task_id, reminder_time], |row| row.get(0))
        .map_err(|e| format!("Failed to query sent reminder: {}", e))?;

    Ok(count > 0)
}

#[cfg(feature = "sqlite")]
pub fn save_sqlite_sent_reminder(handle: &AppHandle, id: &str, task_id: &str, reminder_time: i64, reminder_data: &str) -> Result<(), String> {
    let db_path = get_sqlite_db_path(handle);
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let sent_at = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT OR REPLACE INTO sent_reminders (id, task_id, reminder_time, sent_at, reminder_data) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, task_id, reminder_time, sent_at, reminder_data],
    ).map_err(|e| format!("Failed to save sent reminder: {}", e))?;

    Ok(())
}

#[cfg(feature = "sqlite")]
pub fn cleanup_sqlite_old_reminders(handle: &AppHandle) -> Result<(), String> {
    let db_path = get_sqlite_db_path(handle);
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let thirty_days_ago = chrono::Utc::now().timestamp() - (30 * 24 * 60 * 60);

    conn.execute("DELETE FROM sent_reminders WHERE sent_at < ?1", params![thirty_days_ago])
        .map_err(|e| format!("Failed to cleanup old reminders: {}", e))?;

    Ok(())
}

#[cfg(feature = "sqlite")]
pub fn delete_sqlite_task_reminders(handle: &AppHandle, task_id: &str) -> Result<(), String> {
    let db_path = get_sqlite_db_path(handle);
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    conn.execute("DELETE FROM sent_reminders WHERE task_id = ?1", params![task_id])
        .map_err(|e| format!("Failed to delete task reminders: {}", e))?;

    Ok(())
}

// （已移除 PostgreSQL 实现）


