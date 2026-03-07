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

    Ok(FileEntry {
        name,
        path: path.to_string_lossy().to_string(),
        is_dir: metadata.is_dir(),
        is_hidden: path_utils::is_hidden(path),
        is_symlink,
        size: metadata.len(),
        modified,
        created,
        extension,
        readonly: metadata.permissions().readonly(),
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
        let entry = entry.map_err(|e| e.to_string())?;
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
pub fn get_drives() -> Result<Vec<String>, String> {
    Ok(path_utils::get_drives())
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
