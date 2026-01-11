// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;

use database::{Task, TaskList};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::Manager;

// 通知设置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationSettings {
    pub enabled: bool,
    pub wechat_webhook: Option<String>,
}

// 提醒任务结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReminderTask {
    pub id: String,
    pub task_id: String,
    pub task_title: String,
    pub reminder_time: i64,
    pub repeat: String,
    pub sent: bool,
}

// 初始化数据库
#[tauri::command]
async fn init_database(app_handle: tauri::AppHandle) -> Result<(), String> {
    database::init_database(&app_handle)
}

// 获取所有任务
#[tauri::command]
async fn get_tasks(app_handle: tauri::AppHandle) -> Result<Vec<Task>, String> {
    database::get_all_tasks(&app_handle)
}

// 保存任务
#[tauri::command]
async fn save_task(app_handle: tauri::AppHandle, task: Task) -> Result<(), String> {
    database::save_task(&app_handle, &task)
}

// 删除任务
#[tauri::command]
async fn delete_task(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    database::delete_task(&app_handle, &id)
}

// 获取所有清单
#[tauri::command]
async fn get_lists(app_handle: tauri::AppHandle) -> Result<Vec<TaskList>, String> {
    database::get_all_lists(&app_handle)
}

// 发送系统通知
#[tauri::command]
async fn send_notification(
    title: String,
    body: String,
) -> Result<(), String> {
    use notify_rust::Notification;

    // 尝试发送系统通知
    Notification::new()
        .summary(&title)
        .body(&body)
        .show()
        .map_err(|e| format!("Failed to send notification: {}", e))?;

    Ok(())
}

// 发送企业微信机器人通知
#[tauri::command]
async fn send_wechat_notification(
    webhook_url: String,
    title: String,
    content: String,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let payload = serde_json::json!({
        "msgtype": "text",
        "text": {
            "content": format!("{}\n\n{}", title, content),
        }
    });

    let response = client
        .post(&webhook_url)
        .header("Content-Type", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send wechat notification: {}", e))?;

    if response.status().is_success() {
        Ok(())
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        Err(format!("Wechat API error: {} - {}", status, error_text))
    }
}

// 获取需要提醒的任务
#[tauri::command]
async fn get_due_reminders(
    app_handle: tauri::AppHandle,
) -> Result<Vec<ReminderTask>, String> {
    let tasks = database::get_all_tasks(&app_handle)?;

    let now = chrono::Local::now().timestamp();

    let mut reminders = Vec::new();

    for task in tasks {
        if let Ok(reminders_list) = serde_json::from_str::<Vec<serde_json::Value>>(&task.reminders) {
            for reminder in reminders_list {
                if let Some(date_str) = reminder.get("date").and_then(|d| d.as_str()) {
                    if let Ok(timestamp) = chrono::DateTime::parse_from_rfc3339(date_str) {
                        let reminder_time = timestamp.timestamp();

                        // 检查是否需要提醒（在当前时间1分钟内）
                        if reminder_time <= now && reminder_time > now - 60 {
                            reminders.push(ReminderTask {
                                id: uuid::Uuid::new_v4().to_string(),
                                task_id: task.id.clone(),
                                task_title: task.title.clone(),
                                reminder_time,
                                repeat: reminder.get("repeat").and_then(|r| r.as_str()).unwrap_or("none").to_string(),
                                sent: false,
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(reminders)
}

// 保存通知设置
#[tauri::command]
async fn save_notification_settings(
    app_handle: tauri::AppHandle,
    settings: NotificationSettings,
) -> Result<(), String> {
    let resource_path = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app local data dir: {}", e))?;

    std::fs::create_dir_all(&resource_path)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    let settings_path = resource_path.join("notification_settings.json");
    let settings_json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    std::fs::write(settings_path, settings_json)
        .map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

// 加载通知设置
#[tauri::command]
async fn load_notification_settings(
    app_handle: tauri::AppHandle,
) -> Result<Option<NotificationSettings>, String> {
    let resource_path = app_handle
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app local data dir: {}", e))?;

    let settings_path = resource_path.join("notification_settings.json");

    if !settings_path.exists() {
        return Ok(None);
    }

    let settings_json = std::fs::read_to_string(settings_path)
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    let settings: NotificationSettings = serde_json::from_str(&settings_json)
        .map_err(|e| format!("Failed to parse settings: {}", e))?;

    Ok(Some(settings))
}

// 启动提醒检查任务
fn start_reminder_checker(app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(30)); // 每30秒检查一次

        loop {
            interval.tick().await;

            // 获取通知设置
            let settings_result = load_notification_settings(app_handle.clone()).await;

            if let Ok(Some(settings)) = settings_result {
                if !settings.enabled {
                    continue;
                }

                // 获取到期提醒
                if let Ok(due_reminders) = get_due_reminders(app_handle.clone()).await {
                    for reminder in due_reminders {
                        // 发送系统通知
                        let _ = send_notification(
                            "任务提醒".to_string(),
                            format!("任务: {}", reminder.task_title),
                        ).await;

                        // 如果配置了企业微信 Webhook，也发送企业微信通知
                        if let Some(webhook_url) = &settings.wechat_webhook {
                            let _ = send_wechat_notification(
                                webhook_url.clone(),
                                "任务提醒".to_string(),
                                format!("任务: {}", reminder.task_title),
                            ).await;
                        }
                    }
                }
            }
        }
    });
}

// 原有的问候命令（保留用于测试）
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            init_database,
            get_tasks,
            save_task,
            delete_task,
            get_lists,
            send_notification,
            send_wechat_notification,
            get_due_reminders,
            save_notification_settings,
            load_notification_settings
        ])
        .setup(|app| {
            // 初始化数据库
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = init_database(app_handle.clone()).await {
                    eprintln!("Failed to initialize database: {}", e);
                }
            });

            // 启动提醒检查任务
            let app_handle = app.handle().clone();
            start_reminder_checker(app_handle);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
