use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Cursor, Read, Write};
use std::path::PathBuf;
use tauri::Manager;

/// WebDAV 备份设置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebDavSettings {
    /// 是否启用 WebDAV 备份
    pub enabled: bool,
    /// WebDAV 服务器地址（例如：https://dav.jianguoyun.com/dav）
    pub url: String,
    /// 用户名
    pub username: String,
    /// 密码或访问令牌
    pub password: String,
    /// 存储路径（例如：/my-todo-backups）
    pub base_path: String,
    /// 是否自动备份
    pub auto_backup: bool,
    /// 最大备份数量（超过后保留最新，其余删除）
    #[serde(default)]
    pub max_backups: Option<u32>,
    /// 精简备份：仅备份数据库文件，不打包其他内容
    pub simple_mode: bool,
}

/// 获取应用数据目录路径
fn get_app_data_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(dir)
}

/// 获取 SQLite 数据库文件路径
fn get_sqlite_db_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = get_app_data_dir(app_handle)?;
    Ok(dir.join("todo.db"))
}

/// 保存 WebDAV 设置到本地
#[tauri::command]
pub async fn save_webdav_settings(
    app_handle: tauri::AppHandle,
    settings: WebDavSettings,
) -> Result<(), String> {
    let dir = get_app_data_dir(&app_handle)?;
    let path = dir.join("webdav_settings.json");
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(path, json).map_err(|e| format!("Failed to write settings: {}", e))?;
    Ok(())
}

/// 加载 WebDAV 设置
#[tauri::command]
pub async fn load_webdav_settings(
    app_handle: tauri::AppHandle,
) -> Result<Option<WebDavSettings>, String> {
    let dir = get_app_data_dir(&app_handle)?;
    let path = dir.join("webdav_settings.json");
    if !path.exists() {
        return Ok(None);
    }
    let data = fs::read_to_string(path).map_err(|e| format!("Failed to read settings: {}", e))?;
    let settings: WebDavSettings =
        serde_json::from_str(&data).map_err(|e| format!("Failed to parse settings: {}", e))?;
    Ok(Some(settings))
}

/// 测试 WebDAV 连接
#[tauri::command]
pub async fn test_webdav_connection(settings: WebDavSettings) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let url = normalize_base(&settings.url, &settings.base_path);
    let resp = client
        .get(&url)
        .basic_auth(&settings.username, Some(&settings.password))
        .send()
        .await
        .map_err(|e| format!("Failed to connect WebDAV: {}", e))?;

    if resp.status().is_success() || resp.status() == reqwest::StatusCode::NOT_FOUND {
        Ok(())
    } else {
        Err(format!("WebDAV status: {}", resp.status()))
    }
}

/// 备份到 WebDAV（使用已保存的设置）
#[tauri::command]
pub async fn backup_to_webdav(app_handle: tauri::AppHandle) -> Result<String, String> {
    let settings = load_webdav_settings(app_handle.clone())
        .await?
        .ok_or_else(|| "WebDAV settings not configured".to_string())?;
    if !settings.enabled {
        return Err("WebDAV backup is disabled".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let db_path = get_sqlite_db_path(&app_handle)?;
    if !db_path.exists() {
        return Err("Local database not found".to_string());
    }

    let ts = chrono::Local::now().format("%Y%m%d-%H%M%S").to_string();

    // 构造待上传的内容与文件名
    let (bytes, filename, mime) = if settings.simple_mode {
        let mut buf = Vec::new();
        std::fs::File::open(&db_path)
            .map_err(|e| format!("Failed to open db: {}", e))?
            .read_to_end(&mut buf)
            .map_err(|e| format!("Failed to read db: {}", e))?;
        (buf, format!("todo-backup-{}.db", ts), "application/octet-stream")
    } else {
        // 打包为 ZIP
        let mut zip_buf = Cursor::new(Vec::<u8>::new());
        {
            let mut zip = zip::ZipWriter::new(&mut zip_buf);
            let options = zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Deflated);
            let mut db_file = std::fs::File::open(&db_path)
                .map_err(|e| format!("Failed to open db: {}", e))?;
            let mut db_bytes = Vec::new();
            db_file.read_to_end(&mut db_bytes).map_err(|e| format!("Failed to read db: {}", e))?;

            zip.start_file("todo.db", options)
                .map_err(|e| format!("Failed to write zip: {}", e))?;
            zip.write_all(&db_bytes)
                .map_err(|e| format!("Failed to write zip: {}", e))?;
            zip.finish().map_err(|e| format!("Failed to finalize zip: {}", e))?;
        }
        (zip_buf.into_inner(), format!("todo-backup-{}.zip", ts), "application/zip")
    };

    // 确保远端目录存在（尝试创建，不存在时 MKCOL）
    let base_url = normalize_base(&settings.url, &settings.base_path);
    ensure_remote_dir(&client, &base_url, &settings.username, &settings.password).await?;

    let remote = format!("{}{}", base_url, filename);
    let resp = client
        .put(&remote)
        .basic_auth(&settings.username, Some(&settings.password))
        .header(reqwest::header::CONTENT_TYPE, mime)
        .body(bytes)
        .send()
        .await
        .map_err(|e| format!("Failed to upload backup: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Upload failed: {}", resp.status()));
    }

    Ok(filename)
}

/// 从 WebDAV 恢复（下载指定备份并覆盖本地数据库）
#[tauri::command]
pub async fn restore_from_webdav(app_handle: tauri::AppHandle, filename: String) -> Result<(), String> {
    let settings = load_webdav_settings(app_handle.clone())
        .await?
        .ok_or_else(|| "WebDAV settings not configured".to_string())?;
    if !settings.enabled {
        return Err("WebDAV backup is disabled".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let base_url = normalize_base(&settings.url, &settings.base_path);
    let remote = format!("{}{}", base_url, filename);
    let mut resp = client
        .get(&remote)
        .basic_auth(&settings.username, Some(&settings.password))
        .send()
        .await
        .map_err(|e| format!("Failed to download backup: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("Download failed: {}", resp.status()));
    }
    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let db_path = get_sqlite_db_path(&app_handle)?;
    // 根据扩展名判断是否为 zip
    if filename.ends_with(".zip") {
        let reader = Cursor::new(bytes);
        let mut zip = zip::ZipArchive::new(reader).map_err(|e| format!("Failed to open zip: {}", e))?;
        let mut file = zip.by_name("todo.db").map_err(|e| format!("todo.db not found in zip: {}", e))?;
        let mut out = std::fs::File::create(&db_path).map_err(|e| format!("Failed to create db: {}", e))?;
        let mut buf = Vec::new();
        file.read_to_end(&mut buf).map_err(|e| format!("Failed to read zip entry: {}", e))?;
        out.write_all(&buf).map_err(|e| format!("Failed to write db: {}", e))?;
    } else {
        std::fs::write(&db_path, &bytes).map_err(|e| format!("Failed to write db: {}", e))?;
    }

    Ok(())
}

/// 规范化基础路径，确保以斜杠结尾
fn normalize_base(base: &str, path: &str) -> String {
    let mut url = String::new();
    url.push_str(base.trim_end_matches('/'));
    url.push('/');
    url.push_str(path.trim_start_matches('/'));
    if !url.ends_with('/') {
        url.push('/');
    }
    url
}

/// 确保远端路径可用：尝试 GET，若 404 则尝试 MKCOL 创建目录
async fn ensure_remote_dir(
    client: &reqwest::Client,
    base_url: &str,
    username: &str,
    password: &str,
) -> Result<(), String> {
    eprintln!("[WebDAV] Checking remote dir: {}", base_url);
    eprintln!("[WebDAV] Username: {}", username);

    let resp = client
        .get(base_url)
        .basic_auth(username, Some(password))
        .send()
        .await
        .map_err(|e| format!("Failed to check remote dir: {}", e))?;
    
    if resp.status().is_success() {
        return Ok(());
    }

    eprintln!("[WebDAV] Remote dir check failed: {}, trying MKCOL", resp.status());

    // 尝试创建目录
    let resp = client
        .request(reqwest::Method::from_bytes(b"MKCOL").unwrap(), base_url)
        .basic_auth(username, Some(password))
        .send()
        .await
        .map_err(|e| format!("Failed to create remote dir: {}", e))?;
    
    if resp.status().is_success() || resp.status() == reqwest::StatusCode::METHOD_NOT_ALLOWED {
        // 某些服务器对已存在目录返回 405
        return Ok(());
    }
    
    eprintln!("[WebDAV] MKCOL failed: {}", resp.status());
    Err(format!("Create dir failed: {}", resp.status()))
}
