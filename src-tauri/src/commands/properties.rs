use serde::Serialize;
use std::path::Path;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Drive properties including capacity, used space, free space
#[derive(Debug, Clone, Serialize)]
pub struct DriveProperties {
    pub letter: String,
    pub label: String,
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub used_bytes: u64,
    pub file_system: String,
    pub drive_type: String,
}

/// File/folder properties
#[derive(Debug, Clone, Serialize)]
pub struct FileProperties {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
    pub file_count: Option<u64>,
    pub dir_count: Option<u64>,
    pub created: String,
    pub modified: String,
    pub accessed: String,
    pub readonly: bool,
    pub hidden: bool,
    pub system: bool,
    pub extension: Option<String>,
}

/// Get detailed drive properties
#[tauri::command]
pub fn get_drive_properties(letter: String) -> Result<DriveProperties, String> {
    let drive_char = letter.chars().next().ok_or("Empty drive letter")?;
    let script = format!(
        r#"
        $drive = Get-PSDrive -Name '{letter}' -ErrorAction SilentlyContinue
        if ($drive) {{
            $vol = Get-Volume -DriveLetter '{letter}' -ErrorAction SilentlyContinue
            $fs = if ($vol) {{ $vol.FileSystemType }} else {{ 'Unknown' }}
            $dt = if ($vol) {{ $vol.DriveType }} else {{ 'Unknown' }}
            $label = if ($vol -and $vol.FileSystemLabel) {{ $vol.FileSystemLabel }} else {{ 'Local Disk' }}
            Write-Output "$($drive.Used + $drive.Free)|$($drive.Free)|$fs|$dt|$label"
        }}
        "#,
        letter = drive_char.to_uppercase()
    );

    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let parts: Vec<&str> = stdout.split('|').collect();
    if parts.len() < 5 {
        return Err(format!("Failed to get drive info for {}", letter));
    }

    let total: u64 = parts[0].parse().unwrap_or(0);
    let free: u64 = parts[1].parse().unwrap_or(0);

    Ok(DriveProperties {
        letter: format!("{}:", drive_char.to_uppercase()),
        label: parts[4].to_string(),
        total_bytes: total,
        free_bytes: free,
        used_bytes: total.saturating_sub(free),
        file_system: parts[2].to_string(),
        drive_type: parts[3].to_string(),
    })
}

/// Get all drives with their properties
#[tauri::command]
pub fn get_all_drive_properties() -> Result<Vec<DriveProperties>, String> {
    let script = r#"
    Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Root -match '^[A-Z]:\\$' } | ForEach-Object {
        $letter = $_.Name
        $vol = Get-Volume -DriveLetter $letter -ErrorAction SilentlyContinue
        $fs = if ($vol) { $vol.FileSystemType } else { 'Unknown' }
        $dt = if ($vol) { $vol.DriveType } else { 'Unknown' }
        $label = if ($vol -and $vol.FileSystemLabel) { $vol.FileSystemLabel } else { 'Local Disk' }
        $total = $_.Used + $_.Free
        Write-Output "$letter|$total|$($_.Free)|$fs|$dt|$label"
    }
    "#;

    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut drives = Vec::new();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() < 6 { continue; }
        let total: u64 = parts[1].parse().unwrap_or(0);
        let free: u64 = parts[2].parse().unwrap_or(0);
        drives.push(DriveProperties {
            letter: format!("{}:", parts[0]),
            label: parts[5].to_string(),
            total_bytes: total,
            free_bytes: free,
            used_bytes: total.saturating_sub(free),
            file_system: parts[3].to_string(),
            drive_type: parts[4].to_string(),
        });
    }

    Ok(drives)
}

/// Get file/folder properties (in-app, not OS dialog)
#[tauri::command]
pub fn get_file_properties(path: String) -> Result<FileProperties, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let meta = p.metadata().map_err(|e| e.to_string())?;
    let name = p.file_name().unwrap_or_default().to_string_lossy().to_string();

    let to_rfc3339 = |t: std::io::Result<std::time::SystemTime>| -> String {
        t.ok().map(|st| {
            let dt: chrono::DateTime<chrono::Local> = st.into();
            dt.to_rfc3339()
        }).unwrap_or_default()
    };

    let (file_count, dir_count, size) = if meta.is_dir() {
        // Quick count (non-recursive for speed — use dir_stats for deep count)
        let mut fc = 0u64;
        let mut dc = 0u64;
        if let Ok(entries) = std::fs::read_dir(p) {
            for entry in entries.flatten() {
                if let Ok(ft) = entry.file_type() {
                    if ft.is_dir() { dc += 1; } else { fc += 1; }
                }
            }
        }
        (Some(fc), Some(dc), 0)
    } else {
        (None, None, meta.len())
    };

    // Read Windows file attributes
    let (hidden, system) = get_win_attributes(p);

    let extension = p.extension().map(|e| e.to_string_lossy().to_string());

    Ok(FileProperties {
        path,
        name,
        is_dir: meta.is_dir(),
        size,
        file_count,
        dir_count,
        created: to_rfc3339(meta.created()),
        modified: to_rfc3339(meta.modified()),
        accessed: to_rfc3339(meta.accessed()),
        readonly: meta.permissions().readonly(),
        hidden,
        system,
        extension,
    })
}

/// Set file attributes (hidden, readonly, system)
#[tauri::command]
pub fn set_file_attribute(path: String, attribute: String, value: bool) -> Result<(), String> {
    let flag = match attribute.as_str() {
        "readonly" => "+R",
        "hidden" => "+H",
        "system" => "+S",
        _ => return Err(format!("Unknown attribute: {}", attribute)),
    };
    let flag = if value { flag.to_string() } else { flag.replace('+', "-") };

    std::process::Command::new("attrib")
        .args([&flag, &path])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Enhanced search with filters (type, size, date)
#[tauri::command]
pub async fn search_with_filters(
    path: String,
    query: String,
    file_type: Option<String>,      // "folder", "document", "image", "video", "audio", or extension like ".txt"
    min_size: Option<u64>,
    max_size: Option<u64>,
    modified_after: Option<String>,  // ISO date string
    modified_before: Option<String>,
    max_results: Option<usize>,
) -> Result<Vec<crate::models::file_entry::FileEntry>, String> {
    use walkdir::WalkDir;

    let query_lower = query.to_lowercase();
    let max = max_results.unwrap_or(500);
    let mod_after = modified_after.and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok());
    let mod_before = modified_before.and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok());

    let type_exts: Option<Vec<&str>> = file_type.as_deref().map(|t| match t {
        "document" => vec!["doc", "docx", "pdf", "txt", "rtf", "odt", "xls", "xlsx", "ppt", "pptx", "csv"],
        "image" => vec!["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "ico", "tiff"],
        "video" => vec!["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"],
        "audio" => vec!["mp3", "wav", "flac", "ogg", "aac", "wma", "m4a"],
        _ => vec![],
    });

    let is_folder_filter = file_type.as_deref() == Some("folder");
    let ext_filter = file_type.as_deref().and_then(|t| t.strip_prefix('.'));

    let mut results = Vec::new();

    for entry in WalkDir::new(&path).min_depth(1).max_depth(10).into_iter().filter_map(|e| e.ok()) {
        if results.len() >= max { break; }

        let entry_path = entry.path();
        let name = entry_path.file_name().unwrap_or_default().to_string_lossy();

        // Name filter
        if !query.is_empty() && !name.to_lowercase().contains(&query_lower) {
            continue;
        }

        let meta = match entry_path.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        // Folder filter
        if is_folder_filter && !meta.is_dir() { continue; }
        if !is_folder_filter && file_type.is_some() && meta.is_dir() { continue; }

        // Extension filter
        if let Some(ext) = ext_filter {
            let file_ext = entry_path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if !file_ext.eq_ignore_ascii_case(ext) { continue; }
        }

        // Type category filter
        if let Some(ref exts) = type_exts {
            if !exts.is_empty() {
                let file_ext = entry_path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
                if !exts.contains(&file_ext.as_str()) { continue; }
            }
        }

        // Size filter
        if !meta.is_dir() {
            if let Some(min) = min_size {
                if meta.len() < min { continue; }
            }
            if let Some(max_sz) = max_size {
                if meta.len() > max_sz { continue; }
            }
        }

        // Date filter
        if let Ok(modified) = meta.modified() {
            let dt: chrono::DateTime<chrono::Local> = modified.into();
            if let Some(ref after) = mod_after {
                if dt < *after { continue; }
            }
            if let Some(ref before) = mod_before {
                if dt > *before { continue; }
            }
        }

        // Build FileEntry
        let modified_str = meta.modified().ok().map(|t| {
            let dt: chrono::DateTime<chrono::Local> = t.into();
            dt.to_rfc3339()
        }).unwrap_or_default();
        let created_str = meta.created().ok().map(|t| {
            let dt: chrono::DateTime<chrono::Local> = t.into();
            dt.to_rfc3339()
        }).unwrap_or_default();

        let accessed_str = meta.accessed().ok().map(|t| {
            let dt: chrono::DateTime<chrono::Local> = t.into();
            dt.to_rfc3339()
        }).unwrap_or_default();

        results.push(crate::models::file_entry::FileEntry {
            name: name.to_string(),
            path: entry_path.to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
            is_hidden: crate::utils::path_utils::is_hidden(entry_path),
            is_symlink: entry_path.symlink_metadata().map(|m| m.file_type().is_symlink()).unwrap_or(false),
            size: meta.len(),
            modified: modified_str,
            created: created_str,
            accessed: accessed_str,
            extension: entry_path.extension().map(|e| e.to_string_lossy().to_string()),
            readonly: meta.permissions().readonly(),
            children_count: None,
        });
    }

    Ok(results)
}

fn get_win_attributes(path: &Path) -> (bool, bool) {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::fs::MetadataExt;
        if let Ok(meta) = path.metadata() {
            let attrs = meta.file_attributes();
            let hidden = attrs & 0x2 != 0; // FILE_ATTRIBUTE_HIDDEN
            let system = attrs & 0x4 != 0; // FILE_ATTRIBUTE_SYSTEM
            return (hidden, system);
        }
    }
    (false, false)
}
