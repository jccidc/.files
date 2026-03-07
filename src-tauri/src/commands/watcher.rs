use notify::event::ModifyKind;
use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use tauri::Emitter;

fn watchers() -> &'static Mutex<HashMap<String, RecommendedWatcher>> {
    static WATCHERS: OnceLock<Mutex<HashMap<String, RecommendedWatcher>>> = OnceLock::new();
    WATCHERS.get_or_init(|| Mutex::new(HashMap::new()))
}

#[derive(serde::Serialize, Clone)]
pub struct FsEvent {
    pub kind: String,
    pub paths: Vec<String>,
}

#[tauri::command]
pub fn watch_dir(app: tauri::AppHandle, id: String, path: String) -> Result<(), String> {
    let watch_path = PathBuf::from(&path);
    if !watch_path.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }

    let event_name = format!("fs-change-{}", id);

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                let kind = match event.kind {
                    EventKind::Create(_) => "create",
                    EventKind::Modify(ModifyKind::Name(_)) => "rename",
                    EventKind::Modify(_) => "modify",
                    EventKind::Remove(_) => "remove",
                    _ => return,
                };
                let fs_event = FsEvent {
                    kind: kind.to_string(),
                    paths: event.paths.iter().map(|p| p.to_string_lossy().to_string()).collect(),
                };
                let _ = app.emit(&event_name, fs_event);
            }
        },
        Config::default(),
    )
    .map_err(|e| e.to_string())?;

    watcher
        .watch(&watch_path, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    let mut map = watchers().lock().map_err(|e| e.to_string())?;
    map.insert(id, watcher);

    Ok(())
}

#[tauri::command]
pub fn unwatch_dir(id: String) -> Result<(), String> {
    let mut map = watchers().lock().map_err(|e| e.to_string())?;
    map.remove(&id);
    Ok(())
}
