use crate::models::file_entry::{DirListing, DirStats, FileEntry};
use crate::utils::natural_sort::natural_cmp;
use crate::utils::path_utils;
use chrono::{DateTime, Local};
use std::path::Path;
use walkdir::WalkDir;

/// Build a FileEntry from a path by reading its metadata.
fn build_file_entry(path: &Path) -> Result<FileEntry, String> {
    let metadata = path.metadata().map_err(|e| e.to_string())?;
    let symlink_meta = path.symlink_metadata().ok();
    let is_symlink = symlink_meta
        .as_ref()
        .map(|m| m.file_type().is_symlink())
        .unwrap_or(false);

    let name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let extension = path
        .extension()
        .map(|e| e.to_string_lossy().to_string());

    let modified = metadata
        .modified()
        .ok()
        .map(|t| {
            let dt: DateTime<Local> = t.into();
            dt.to_rfc3339()
        })
        .unwrap_or_default();

    let created = metadata
        .created()
        .ok()
        .map(|t| {
            let dt: DateTime<Local> = t.into();
            dt.to_rfc3339()
        })
        .unwrap_or_default();

    let accessed = metadata
        .accessed()
        .ok()
        .map(|t| {
            let dt: DateTime<Local> = t.into();
            dt.to_rfc3339()
        })
        .unwrap_or_default();

    let is_dir = metadata.is_dir();
    let children_count = if is_dir {
        std::fs::read_dir(path).ok().map(|rd| rd.count() as u32)
    } else {
        None
    };

    Ok(FileEntry {
        name,
        path: path.to_string_lossy().to_string(),
        is_dir,
        is_hidden: path_utils::is_hidden(path),
        is_symlink,
        size: metadata.len(),
        modified,
        created,
        accessed,
        extension,
        readonly: metadata.permissions().readonly(),
        children_count,
    })
}

#[tauri::command]
pub fn read_dir(path: String, show_hidden: bool) -> Result<DirListing, String> {
    let dir_path = Path::new(&path);
    if !dir_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let mut entries: Vec<FileEntry> = Vec::new();

    for entry in WalkDir::new(&path).min_depth(1).max_depth(1) {
        let Ok(entry) = entry else { continue }; // skip inaccessible entries
        let entry_path = entry.path();

        match build_file_entry(entry_path) {
            Ok(file_entry) => {
                if !show_hidden && file_entry.is_hidden {
                    continue;
                }
                entries.push(file_entry);
            }
            Err(_) => continue, // skip entries we can't read
        }
    }

    // Sort: directories first, then natural sort by name (case-insensitive)
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| natural_cmp(&a.name.to_lowercase(), &b.name.to_lowercase()))
    });

    let total_count = entries.len();
    Ok(DirListing {
        path,
        entries,
        total_count,
    })
}

#[tauri::command]
pub fn stat_file(path: String) -> Result<FileEntry, String> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    build_file_entry(file_path)
}

#[tauri::command]
pub fn get_drives() -> Result<Vec<path_utils::DriveInfo>, String> {
    // Detect cloud mount paths so we can flag cloud-mounted drives (e.g. G:\ for GDFS)
    let cloud_mounts = crate::commands::cloud::detect_cloud_mounts();
    let cloud_paths: Vec<String> = cloud_mounts.into_iter().map(|m| m.path).collect();
    Ok(path_utils::get_drives_with_cloud_filter(&cloud_paths))
}

#[tauri::command]
pub fn read_text_file(path: String, max_bytes: usize) -> Result<String, String> {
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let truncated = if bytes.len() > max_bytes {
        &bytes[..max_bytes]
    } else {
        &bytes
    };
    Ok(String::from_utf8_lossy(truncated).to_string())
}

#[tauri::command]
pub async fn dir_stats(path: String) -> Result<DirStats, String> {
    let dir_path = std::path::Path::new(&path);
    if !dir_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let mut file_count: u64 = 0;
    let mut dir_count: u64 = 0;
    let mut total_size: u64 = 0;
    let mut truncated = false;
    const MAX_ENTRIES: u64 = 100_000;

    for entry in WalkDir::new(&path).min_depth(1) {
        if file_count + dir_count >= MAX_ENTRIES {
            truncated = true;
            break;
        }
        if let Ok(entry) = entry {
            if let Ok(meta) = entry.metadata() {
                if meta.is_dir() {
                    dir_count += 1;
                } else {
                    file_count += 1;
                    total_size += meta.len();
                }
            }
        }
    }

    Ok(DirStats {
        file_count,
        dir_count,
        total_size,
        truncated,
    })
}

#[tauri::command]
pub fn read_file_bytes(path: String) -> Result<String, String> {
    use base64::Engine;
    let file_path = Path::new(&path);
    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&bytes))
}

#[tauri::command]
pub fn create_folder(parent: String, name: String) -> Result<String, String> {
    let parent_path = Path::new(&parent);
    if !parent_path.is_dir() {
        return Err(format!("Parent is not a directory: {}", parent));
    }
    let target = parent_path.join(&name);
    if target.exists() {
        return Err(format!("Already exists: {}", target.display()));
    }
    std::fs::create_dir(&target).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn create_file(parent: String, name: String) -> Result<String, String> {
    let parent_path = Path::new(&parent);
    if !parent_path.is_dir() {
        return Err(format!("Parent is not a directory: {}", parent));
    }
    let target = parent_path.join(&name);
    if target.exists() {
        return Err(format!("Already exists: {}", target.display()));
    }
    std::fs::File::create(&target).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

/// Calculate sizes for multiple folders in batch.
/// Returns a map of path -> total size in bytes.
/// Skips folders that take too long (>2s per folder) or are inaccessible.
#[tauri::command]
pub async fn batch_folder_sizes(paths: Vec<String>) -> Result<Vec<(String, u64)>, String> {
    let mut results = Vec::new();

    for path in &paths {
        let dir_path = std::path::Path::new(path);
        if !dir_path.is_dir() {
            results.push((path.clone(), 0));
            continue;
        }

        let mut total_size: u64 = 0;
        let mut count: u64 = 0;
        let start = std::time::Instant::now();

        for entry in WalkDir::new(path).min_depth(1).into_iter().filter_map(|e| e.ok()) {
            // Timeout: skip if taking too long (2 seconds per folder)
            if start.elapsed().as_secs() > 2 {
                break;
            }
            count += 1;
            // Safety cap: don't walk more than 50K entries per folder
            if count > 50_000 {
                break;
            }
            if let Ok(meta) = entry.metadata() {
                if !meta.is_dir() {
                    total_size += meta.len();
                }
            }
        }

        results.push((path.clone(), total_size));
    }

    Ok(results)
}

/// Returns the real paths for Desktop, Documents, Downloads --
/// accounting for OneDrive folder backup redirects.
#[tauri::command]
pub fn get_known_folder_paths() -> Result<Vec<(String, String)>, String> {
    let user_profile = std::env::var("USERPROFILE").unwrap_or_default();
    if user_profile.is_empty() {
        return Err("USERPROFILE not set".into());
    }

    let onedrive = std::env::var("OneDrive")
        .or_else(|_| std::env::var("OneDriveConsumer"))
        .or_else(|_| std::env::var("OneDriveCommercial"))
        .ok();

    let mut results = Vec::new();

    for folder in &["Desktop", "Documents", "Downloads"] {
        // Check OneDrive-backed path first
        let path = if let Some(ref od) = onedrive {
            let od_path = format!("{}\\{}", od.trim_end_matches('\\'), folder);
            if Path::new(&od_path).is_dir() {
                od_path
            } else {
                format!("{}\\{}", &user_profile, folder)
            }
        } else {
            format!("{}\\{}", &user_profile, folder)
        };
        results.push((folder.to_string(), path));
    }

    Ok(results)
}
