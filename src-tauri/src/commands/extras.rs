use std::path::Path;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// List contents of the Recycle Bin
#[tauri::command]
pub fn list_recycle_bin() -> Result<Vec<(String, String, String)>, String> {
    let script = r#"
    $shell = New-Object -ComObject Shell.Application
    $bin = $shell.Namespace(10)
    $bin.Items() | ForEach-Object {
        $name = $_.Name
        $path = $_.Path
        $size = $_.ExtendedProperty('System.Size')
        Write-Output "$name|$path|$size"
    }
    "#;
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let items: Vec<(String, String, String)> = stdout
        .lines()
        .filter(|l| !l.trim().is_empty())
        .filter_map(|l| {
            let parts: Vec<&str> = l.splitn(3, '|').collect();
            if parts.len() >= 2 {
                Some((
                    parts[0].to_string(),
                    parts[1].to_string(),
                    parts.get(2).unwrap_or(&"0").to_string(),
                ))
            } else {
                None
            }
        })
        .collect();

    Ok(items)
}

/// Empty the Recycle Bin
#[tauri::command]
pub fn empty_recycle_bin() -> Result<(), String> {
    let script = r#"
    $shell = New-Object -ComObject Shell.Application
    $shell.Namespace(10).Items() | ForEach-Object { $_.InvokeVerb('delete') }
    "#;
    std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Restore a file from the Recycle Bin
#[tauri::command]
pub fn restore_from_bin(item_name: String) -> Result<(), String> {
    let escaped = item_name.replace('\'', "''");
    let script = format!(
        r#"
        $shell = New-Object -ComObject Shell.Application
        $bin = $shell.Namespace(10)
        $item = $bin.Items() | Where-Object {{ $_.Name -eq '{}' }} | Select-Object -First 1
        if ($item) {{ $item.InvokeVerb('undelete') }}
        "#,
        escaped
    );
    std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Create a symbolic link (requires elevation on some systems)
#[tauri::command]
pub fn create_symlink(target: String, link_path: String) -> Result<(), String> {
    let target_p = Path::new(&target);
    let link_p = Path::new(&link_path);

    if target_p.is_dir() {
        std::os::windows::fs::symlink_dir(target_p, link_p).map_err(|e| e.to_string())?;
    } else {
        std::os::windows::fs::symlink_file(target_p, link_p).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Permanently delete files (bypass Recycle Bin)
#[tauri::command]
pub fn permanent_delete(paths: Vec<String>) -> Result<(), String> {
    for p in &paths {
        let path = Path::new(p);
        if !path.exists() {
            return Err(format!("Path does not exist: {}", p));
        }
        if path.is_dir() {
            std::fs::remove_dir_all(path).map_err(|e| e.to_string())?;
        } else {
            std::fs::remove_file(path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Search within file contents (grep-like)
#[tauri::command]
pub async fn search_file_contents(
    dir: String,
    query: String,
    max_results: Option<usize>,
) -> Result<Vec<(String, u32, String)>, String> {
    let max = max_results.unwrap_or(200);
    let query_lower = query.to_lowercase();
    let mut results: Vec<(String, u32, String)> = Vec::new();

    // Only search text-like files
    let text_exts = [
        "txt", "md", "rs", "ts", "tsx", "js", "jsx", "json", "html", "css",
        "py", "rb", "go", "java", "c", "cpp", "h", "hpp", "cs", "xml",
        "yaml", "yml", "toml", "ini", "cfg", "conf", "sh", "bat", "ps1",
        "sql", "log", "csv", "gpc", "lua", "svelte", "vue",
    ];

    for entry in walkdir::WalkDir::new(&dir)
        .min_depth(1)
        .max_depth(5)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if results.len() >= max { break; }

        let path = entry.path();
        if !path.is_file() { continue; }

        let ext = path.extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        if !text_exts.contains(&ext.as_str()) { continue; }

        // Skip large files (>1MB)
        if let Ok(meta) = path.metadata() {
            if meta.len() > 1_048_576 { continue; }
        }

        if let Ok(content) = std::fs::read_to_string(path) {
            for (line_num, line) in content.lines().enumerate() {
                if results.len() >= max { break; }
                if line.to_lowercase().contains(&query_lower) {
                    results.push((
                        path.to_string_lossy().to_string(),
                        (line_num + 1) as u32,
                        line.chars().take(200).collect(),
                    ));
                }
            }
        }
    }

    Ok(results)
}

/// Toggle fullscreen
#[tauri::command]
pub fn toggle_fullscreen(window: tauri::WebviewWindow) -> Result<(), String> {
    let is_fullscreen = window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(!is_fullscreen).map_err(|e| e.to_string())?;
    Ok(())
}
