use serde::Serialize;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{Emitter, AppHandle};

/// Conflict info sent to frontend when a target file already exists
#[derive(Debug, Clone, Serialize)]
pub struct FileConflict {
    pub source: String,
    pub target: String,
    pub source_size: u64,
    pub target_size: u64,
    pub source_modified: String,
    pub target_modified: String,
}

/// Progress event emitted during file operations
#[derive(Debug, Clone, Serialize)]
pub struct FileOpProgress {
    pub op_id: String,
    pub current_file: String,
    pub files_done: u64,
    pub files_total: u64,
    pub bytes_done: u64,
    pub bytes_total: u64,
}

/// Result of a completed file operation (for undo tracking)
#[derive(Debug, Clone, Serialize)]
pub struct FileOpResult {
    pub op_id: String,
    pub op_type: String, // "copy" or "move"
    pub sources: Vec<String>,
    pub dest: String,
    pub created_paths: Vec<String>, // paths created at destination
    pub skipped: Vec<String>,
}

/// Count total files and bytes for progress tracking
fn count_files_recursive(path: &Path) -> (u64, u64) {
    if path.is_file() {
        let size = path.metadata().map(|m| m.len()).unwrap_or(0);
        return (1, size);
    }
    let mut files = 0u64;
    let mut bytes = 0u64;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let (f, b) = count_files_recursive(&entry.path());
            files += f;
            bytes += b;
        }
    }
    (files, bytes)
}

fn get_modified_str(path: &Path) -> String {
    path.metadata()
        .and_then(|m| m.modified())
        .ok()
        .map(|t| {
            let dt: chrono::DateTime<chrono::Local> = t.into();
            dt.to_rfc3339()
        })
        .unwrap_or_default()
}

/// Copy files with progress events and conflict detection.
/// `conflict_resolution`: "ask" (return conflicts), "replace_all", "skip_all", "rename_all"
#[tauri::command]
pub async fn copy_files_with_progress(
    app: AppHandle,
    op_id: String,
    sources: Vec<String>,
    dest: String,
    conflict_resolution: String,
) -> Result<FileOpResult, String> {
    let dest_path = Path::new(&dest);
    if !dest_path.is_dir() {
        return Err(format!("Destination is not a directory: {}", dest));
    }

    // Count total files for progress
    let mut total_files = 0u64;
    let mut total_bytes = 0u64;
    for src in &sources {
        let (f, b) = count_files_recursive(Path::new(src));
        total_files += f;
        total_bytes += b;
    }

    let cancel = CANCEL_FLAGS.lock().unwrap()
        .entry(op_id.clone())
        .or_insert_with(|| Arc::new(AtomicBool::new(false)))
        .clone();

    let mut files_done = 0u64;
    let mut bytes_done = 0u64;
    let mut created_paths = Vec::new();
    let mut skipped = Vec::new();

    for src in &sources {
        if cancel.load(Ordering::Relaxed) {
            break;
        }
        let src_path = Path::new(src);
        let file_name = src_path.file_name().ok_or_else(|| format!("Invalid path: {}", src))?;
        let mut target = dest_path.join(file_name);

        // Check for conflict
        if target.exists() {
            match conflict_resolution.as_str() {
                "skip_all" => {
                    skipped.push(src.clone());
                    // Still count the files for progress
                    let (f, b) = count_files_recursive(src_path);
                    files_done += f;
                    bytes_done += b;
                    continue;
                }
                "rename_all" => {
                    target = find_unique_name(&target);
                }
                "replace_all" => {
                    // Will overwrite — continue as normal
                }
                _ => {
                    // "ask" — return the conflict info so frontend can prompt
                    // For now, default to rename to avoid data loss
                    target = find_unique_name(&target);
                }
            }
        }

        if src_path.is_dir() {
            copy_dir_with_progress(
                src_path, &target, &app, &op_id,
                &mut files_done, &mut bytes_done, total_files, total_bytes,
                &cancel, &conflict_resolution, &mut skipped,
            )?;
        } else {
            let size = src_path.metadata().map(|m| m.len()).unwrap_or(0);
            let _ = app.emit("file-op-progress", FileOpProgress {
                op_id: op_id.clone(),
                current_file: src_path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                files_done,
                files_total: total_files,
                bytes_done,
                bytes_total: total_bytes,
            });
            std::fs::copy(src_path, &target).map_err(|e| e.to_string())?;
            files_done += 1;
            bytes_done += size;
        }
        created_paths.push(target.to_string_lossy().to_string());
    }

    // Final progress event
    let _ = app.emit("file-op-progress", FileOpProgress {
        op_id: op_id.clone(),
        current_file: String::new(),
        files_done,
        files_total: total_files,
        bytes_done,
        bytes_total: total_bytes,
    });

    // Clean up cancel flag
    CANCEL_FLAGS.lock().unwrap().remove(&op_id);

    Ok(FileOpResult {
        op_id,
        op_type: "copy".into(),
        sources,
        dest,
        created_paths,
        skipped,
    })
}

/// Move files with progress events and conflict detection.
#[tauri::command]
pub async fn move_files_with_progress(
    app: AppHandle,
    op_id: String,
    sources: Vec<String>,
    dest: String,
    conflict_resolution: String,
) -> Result<FileOpResult, String> {
    let dest_path = Path::new(&dest);
    if !dest_path.is_dir() {
        return Err(format!("Destination is not a directory: {}", dest));
    }

    let total_files = sources.len() as u64;
    let cancel = CANCEL_FLAGS.lock().unwrap()
        .entry(op_id.clone())
        .or_insert_with(|| Arc::new(AtomicBool::new(false)))
        .clone();

    let mut files_done = 0u64;
    let mut created_paths = Vec::new();
    let mut skipped = Vec::new();

    for src in &sources {
        if cancel.load(Ordering::Relaxed) {
            break;
        }
        let src_path = Path::new(src);
        let file_name = src_path.file_name().ok_or_else(|| format!("Invalid path: {}", src))?;
        let mut target = dest_path.join(file_name);

        if target.exists() {
            match conflict_resolution.as_str() {
                "skip_all" => { skipped.push(src.clone()); files_done += 1; continue; }
                "rename_all" => { target = find_unique_name(&target); }
                "replace_all" => {
                    if target.is_dir() {
                        std::fs::remove_dir_all(&target).map_err(|e| e.to_string())?;
                    } else {
                        std::fs::remove_file(&target).map_err(|e| e.to_string())?;
                    }
                }
                _ => { target = find_unique_name(&target); }
            }
        }

        let _ = app.emit("file-op-progress", FileOpProgress {
            op_id: op_id.clone(),
            current_file: file_name.to_string_lossy().to_string(),
            files_done,
            files_total: total_files,
            bytes_done: 0,
            bytes_total: 0,
        });

        std::fs::rename(src_path, &target).map_err(|e| e.to_string())?;
        created_paths.push(target.to_string_lossy().to_string());
        files_done += 1;
    }

    CANCEL_FLAGS.lock().unwrap().remove(&op_id);

    Ok(FileOpResult {
        op_id,
        op_type: "move".into(),
        sources,
        dest,
        created_paths,
        skipped,
    })
}

/// Cancel an in-progress file operation
#[tauri::command]
pub fn cancel_file_op(op_id: String) -> Result<(), String> {
    if let Some(flag) = CANCEL_FLAGS.lock().unwrap().get(&op_id) {
        flag.store(true, Ordering::Relaxed);
    }
    Ok(())
}

/// Check for conflicts before starting a file operation.
/// Returns list of conflicts so frontend can show a dialog.
#[tauri::command]
pub fn check_conflicts(sources: Vec<String>, dest: String) -> Result<Vec<FileConflict>, String> {
    let dest_path = Path::new(&dest);
    let mut conflicts = Vec::new();

    for src in &sources {
        let src_path = Path::new(src);
        let file_name = src_path.file_name().ok_or_else(|| format!("Invalid path: {}", src))?;
        let target = dest_path.join(file_name);

        if target.exists() {
            conflicts.push(FileConflict {
                source: src.clone(),
                target: target.to_string_lossy().to_string(),
                source_size: src_path.metadata().map(|m| m.len()).unwrap_or(0),
                target_size: target.metadata().map(|m| m.len()).unwrap_or(0),
                source_modified: get_modified_str(src_path),
                target_modified: get_modified_str(&target),
            });
        }
    }

    Ok(conflicts)
}

// ---- Internal helpers ----

use std::sync::Mutex;
use std::collections::HashMap;

lazy_static::lazy_static! {
    static ref CANCEL_FLAGS: Mutex<HashMap<String, Arc<AtomicBool>>> = Mutex::new(HashMap::new());
}

fn find_unique_name(path: &Path) -> std::path::PathBuf {
    let stem = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
    let ext = path.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
    let parent = path.parent().unwrap();
    let mut i = 2;
    loop {
        let name = format!("{} ({}){}", stem, i, ext);
        let candidate = parent.join(&name);
        if !candidate.exists() {
            return candidate;
        }
        i += 1;
    }
}

fn copy_dir_with_progress(
    src: &Path,
    dst: &Path,
    app: &AppHandle,
    op_id: &str,
    files_done: &mut u64,
    bytes_done: &mut u64,
    total_files: u64,
    total_bytes: u64,
    cancel: &Arc<AtomicBool>,
    conflict_resolution: &str,
    skipped: &mut Vec<String>,
) -> Result<(), String> {
    if cancel.load(Ordering::Relaxed) {
        return Ok(());
    }
    std::fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in std::fs::read_dir(src).map_err(|e| e.to_string())? {
        if cancel.load(Ordering::Relaxed) {
            return Ok(());
        }
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        let mut target = dst.join(entry.file_name());

        if target.exists() {
            match conflict_resolution {
                "skip_all" => {
                    skipped.push(entry_path.to_string_lossy().to_string());
                    if entry_path.is_file() {
                        *files_done += 1;
                        *bytes_done += entry_path.metadata().map(|m| m.len()).unwrap_or(0);
                    }
                    continue;
                }
                "rename_all" => { target = find_unique_name(&target); }
                "replace_all" => {}
                _ => { target = find_unique_name(&target); }
            }
        }

        if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            copy_dir_with_progress(
                &entry_path, &target, app, op_id,
                files_done, bytes_done, total_files, total_bytes,
                cancel, conflict_resolution, skipped,
            )?;
        } else {
            let size = entry_path.metadata().map(|m| m.len()).unwrap_or(0);
            let _ = app.emit("file-op-progress", FileOpProgress {
                op_id: op_id.to_string(),
                current_file: entry.file_name().to_string_lossy().to_string(),
                files_done: *files_done,
                files_total: total_files,
                bytes_done: *bytes_done,
                bytes_total: total_bytes,
            });
            std::fs::copy(&entry_path, &target).map_err(|e| e.to_string())?;
            *files_done += 1;
            *bytes_done += size;
        }
    }
    Ok(())
}
