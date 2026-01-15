// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod backup;

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

// 获取所有任务
#[tauri::command]
async fn get_tasks(app_handle: tauri::AppHandle) -> Result<Vec<Task>, String> {
    #[cfg(feature = "sqlite")]
    {
        return database::get_sqlite_tasks(&app_handle);
    }

    #[cfg(not(feature = "sqlite"))]
    {
        Err("No database available".to_string())
    }
}

// 保存任务
#[tauri::command]
async fn save_task(app_handle: tauri::AppHandle, task: Task) -> Result<(), String> {
    #[cfg(feature = "sqlite")]
    {
        return database::save_sqlite_task(&app_handle, &task);
    }

    #[cfg(not(feature = "sqlite"))]
    {
        Err("No database available".to_string())
    }
}

// 删除任务
#[tauri::command]
async fn delete_task(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    #[cfg(feature = "sqlite")]
    {
        return database::delete_sqlite_task(&app_handle, &id);
    }

    #[cfg(not(feature = "sqlite"))]
    {
        Err("No database available".to_string())
    }
}

// 获取所有清单
#[tauri::command]
async fn get_lists(app_handle: tauri::AppHandle) -> Result<Vec<TaskList>, String> {
    #[cfg(feature = "sqlite")]
    {
        return database::get_sqlite_lists(&app_handle);
    }

    #[cfg(not(feature = "sqlite"))]
    {
        Err("No database available".to_string())
    }
}

// ========== 辅助函数 ==========
// 无额外辅助函数

// ========== 通知相关命令 ==========

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

// 检查通知权限状态
// Windows 桌面应用默认拥有通知权限，用户可在系统设置中手动关闭
#[tauri::command]
async fn check_notification_permission() -> Result<String, String> {
    // Windows 上桌面应用默认有通知权限
    // 如果用户在系统设置中关闭了通知，发送时会静默失败
    Ok("granted".to_string())
}

// 请求通知权限（Windows 上需要用户手动在设置中开启）
#[tauri::command]
async fn request_notification_permission() -> Result<bool, String> {
    // Windows 上通知权限由系统设置控制
    // 我们返回 true 表示应用已准备好发送通知
    // 如果用户在系统设置中关闭了通知，通知会静默失败
    Ok(true)
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

// 获取需要提醒的任务（改进版 - 只获取未发送的到期提醒）
#[tauri::command]
async fn get_due_reminders(
    app_handle: tauri::AppHandle,
) -> Result<Vec<ReminderTask>, String> {
    let tasks = get_tasks(app_handle.clone()).await?;
    let now = chrono::Local::now().timestamp();
    eprintln!("[Reminder] Checking reminders, current time: {}", now);

    let mut reminders = Vec::new();
    let mut checked_count = 0;

    for task in tasks {
        // 跳过已完成的任务
        if task.completed {
            continue;
        }

        checked_count += 1;

        if let Ok(reminders_list) = serde_json::from_str::<Vec<serde_json::Value>>(&task.reminders) {
            for reminder in reminders_list {
                if let Some(date_str) = reminder.get("date").and_then(|d| d.as_str()) {
                    if let Ok(timestamp) = chrono::DateTime::parse_from_rfc3339(date_str) {
                        let reminder_time = timestamp.timestamp();

                        // 检查是否已发送过此提醒
                        let already_sent = is_reminder_sent(&app_handle, &task.id, reminder_time).await?;

                        eprintln!("[Reminder] Task: {}, reminder_time: {}, now: {}, already_sent: {}",
                            task.title, reminder_time, now, already_sent);

                        // 只处理已到期但未发送的提醒
                        if reminder_time <= now && !already_sent {
                            let repeat = reminder.get("repeat").and_then(|r| r.as_str()).unwrap_or("none").to_string();

                            eprintln!("[Reminder] Adding due reminder: {} at {}", task.title, reminder_time);

                            reminders.push(ReminderTask {
                                id: uuid::Uuid::new_v4().to_string(),
                                task_id: task.id.clone(),
                                task_title: task.title.clone(),
                                reminder_time,
                                repeat: repeat.clone(),
                                sent: false,
                            });
                        }
                    }
                }
            }
        }
    }

    eprintln!("[Reminder] Checked {} tasks, found {} due reminders", checked_count, reminders.len());
    Ok(reminders)
}

// 检查提醒是否已发送
async fn is_reminder_sent(
    app_handle: &tauri::AppHandle,
    task_id: &str,
    reminder_time: i64,
) -> Result<bool, String> {
    #[cfg(feature = "sqlite")]
    {
        return database::is_sqlite_reminder_sent(app_handle, task_id, reminder_time);
    }

    #[cfg(not(feature = "sqlite"))]
    {
        Ok(false)
    }
}

// 处理单个提醒发送
async fn process_reminder(
    app_handle: tauri::AppHandle,
    reminder: ReminderTask,
    settings: &NotificationSettings,
) -> Result<(), String> {
    eprintln!("[Reminder] Processing reminder for task: {}", reminder.task_title);

    // 发送系统通知
    match send_notification(
        "任务提醒".to_string(),
        format!("任务: {}", reminder.task_title),
    ).await {
        Ok(_) => eprintln!("[Reminder] System notification sent"),
        Err(e) => eprintln!("[Reminder] Failed to send system notification: {}", e),
    }

    // 如果配置了企业微信 Webhook，也发送企业微信通知
    if let Some(webhook_url) = &settings.wechat_webhook {
        match send_wechat_notification(
            webhook_url.clone(),
            "任务提醒".to_string(),
            format!("任务: {}", reminder.task_title),
        ).await {
            Ok(_) => eprintln!("[Reminder] WeChat notification sent"),
            Err(e) => eprintln!("[Reminder] Failed to send WeChat notification: {}", e),
        }
    }

    // 记录已发送的提醒
    let reminder_data = serde_json::json!({
        "date": chrono::DateTime::from_timestamp(reminder.reminder_time, 0)
            .unwrap_or_default()
            .to_rfc3339(),
        "repeat": reminder.repeat,
    });

    save_sent_reminder_internal(
        &app_handle,
        &reminder.id,
        &reminder.task_id,
        reminder.reminder_time,
        &reminder_data.to_string(),
    ).await?;

    eprintln!("[Reminder] Reminder marked as sent");
    Ok(())
}

// 保存已发送提醒
async fn save_sent_reminder_internal(
    app_handle: &tauri::AppHandle,
    id: &str,
    task_id: &str,
    reminder_time: i64,
    reminder_data: &str,
) -> Result<(), String> {
    #[cfg(feature = "sqlite")]
    {
        return database::save_sqlite_sent_reminder(app_handle, id, task_id, reminder_time, reminder_data);
    }

    #[cfg(not(feature = "sqlite"))]
    {
        Ok(())
    }
}

// 启动提醒检查任务（改进版）
fn start_reminder_checker(app_handle: tauri::AppHandle) {
    eprintln!("[Reminder] Starting reminder checker task");

    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(10)); // 每10秒检查一次
        let mut cleanup_counter = 0;

        loop {
            interval.tick().await;

            eprintln!("[Reminder] Running reminder check...");
            check_and_send_reminders(app_handle.clone()).await;

            // 每100次检查（约100分钟）清理一次旧记录
            cleanup_counter += 1;
            if cleanup_counter >= 100 {
                eprintln!("[Reminder] Running cleanup of old reminders");
                let _ = cleanup_old_reminders_internal(&app_handle).await;
                cleanup_counter = 0;
            }
        }
    });
}

// 立即检查并发送到期的提醒（由前端主动调用）
#[tauri::command]
async fn check_and_send_due_reminders(app_handle: tauri::AppHandle) -> Result<(), String> {
    eprintln!("[Reminder] Manual reminder check triggered");

    // 获取通知设置
    let settings_result = load_notification_settings(app_handle.clone()).await;

    // 如果没有保存过设置，使用默认设置（启用通知）
    let settings = match settings_result {
        Ok(Some(s)) => s,
        Ok(None) => {
            eprintln!("[Reminder] No saved settings, using defaults (notifications enabled)");
            NotificationSettings {
                enabled: true,
                wechat_webhook: None,
            }
        }
        Err(e) => {
            eprintln!("[Reminder] Failed to load settings: {}, using defaults", e);
            NotificationSettings {
                enabled: true,
                wechat_webhook: None,
            }
        }
    };

    if !settings.enabled {
        eprintln!("[Reminder] Notifications disabled, skipping");
        return Ok(());
    }

    check_and_send_reminders(app_handle.clone()).await;

    Ok(())
}

// 检查并发送到期提醒的核心逻辑
async fn check_and_send_reminders(app_handle: tauri::AppHandle) {
    let settings_result = load_notification_settings(app_handle.clone()).await;

    let settings = match settings_result {
        Ok(Some(s)) => s,
        _ => NotificationSettings {
            enabled: true,
            wechat_webhook: None,
        }
    };

    if !settings.enabled {
        return;
    }

    // 获取到期提醒
    match get_due_reminders(app_handle.clone()).await {
        Ok(due_reminders) => {
            eprintln!("[Reminder] Found {} due reminders", due_reminders.len());

            for reminder in due_reminders {
                eprintln!("[Reminder] Processing: {} at {}", reminder.task_title, reminder.reminder_time);
                // 处理提醒发送
                match process_reminder(
                    app_handle.clone(),
                    reminder,
                    &settings,
                ).await {
                    Ok(_) => {},
                    Err(e) => eprintln!("[Reminder] Failed to process reminder: {}", e),
                }
            }
        }
        Err(e) => {
            eprintln!("[Reminder] Failed to get due reminders: {}", e);
        }
    }
}

// 清理旧的提醒记录
async fn cleanup_old_reminders_internal(app_handle: &tauri::AppHandle) -> Result<(), String> {
    #[cfg(feature = "sqlite")]
    {
        return database::cleanup_sqlite_old_reminders(app_handle);
    }

    #[cfg(not(feature = "sqlite"))]
    {
        Ok(())
    }
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

// 原有的问候命令（保留用于测试）
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 显示窗口（仅桌面平台）
#[tauri::command]
#[cfg(not(target_os = "android"))]
fn show_window(app_handle: tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

// 显示窗口（移动平台占位）
#[tauri::command]
#[cfg(target_os = "android")]
fn show_window(_app_handle: tauri::AppHandle) {
    // 移动平台不需要此操作
}

// 退出应用
#[tauri::command]
fn exit_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_tasks,
            save_task,
            delete_task,
            get_lists,
            send_notification,
            send_wechat_notification,
            get_due_reminders,
            save_notification_settings,
            load_notification_settings,
            check_notification_permission,
            request_notification_permission,
            check_and_send_due_reminders,
            show_window,
            exit_app,
            // 备份相关命令
            backup::save_webdav_settings,
            backup::load_webdav_settings,
            backup::test_webdav_connection,
            backup::backup_to_webdav,
            backup::restore_from_webdav,
        ])
        .setup(|app| {
            // 初始化数据库（仅 SQLite）
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                #[cfg(feature = "sqlite")]
                if let Err(e) = database::init_sqlite_database(&app_handle) {
                    eprintln!("Failed to initialize database: {}", e);
                }
            });

            // 启动提醒检查任务
            let app_handle = app.handle().clone();
            start_reminder_checker(app_handle);

            // 拦截窗口关闭事件，隐藏窗口而不是退出（仅桌面平台）
            #[cfg(not(target_os = "android"))]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let window_clone = window.clone();
                    window.on_window_event(move |event| {
                        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                            eprintln!("[App] Close requested, hiding to tray");
                            api.prevent_close();
                            let _ = window_clone.hide();
                        }
                    });
                }
            }

            // 创建托盘菜单
            #[cfg(target_os = "windows")]
            {
                use tauri::menu::{MenuBuilder, MenuItemBuilder};
                use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

                let show_item = MenuItemBuilder::with_id("show", "显示窗口").build(app)?;
                let quit_item = MenuItemBuilder::with_id("quit", "退出").build(app)?;
                let menu = MenuBuilder::new(app)
                    .items(&[&show_item, &quit_item])
                    .build()?;

                // 从编译时嵌入的图标数据加载并解码为 RGBA
                let icon_data = include_bytes!("../icons/icon.png");
                let decoded_image = image::load_from_memory(icon_data)
                    .map_err(|e| format!("Failed to decode icon image: {}", e))?
                    .into_rgba8();
                let (width, height) = decoded_image.dimensions();
                let rgba = decoded_image.to_vec();
                let icon = tauri::image::Image::new_owned(rgba, width, height);

                TrayIconBuilder::new()
                    .icon(icon)
                    .menu(&menu)
                    .on_menu_event(move |app, event| {
                        match event.id().as_ref() {
                            "show" => {
                                eprintln!("[Tray] Show window clicked");
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                            "quit" => {
                                eprintln!("[Tray] Quit clicked");
                                app.exit(0);
                            }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            eprintln!("[Tray] Left click");
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.unminimize();
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(app)?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
