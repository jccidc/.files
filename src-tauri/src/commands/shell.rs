use std::path::Path;

#[tauri::command]
pub fn delete_to_trash(paths: Vec<String>) -> Result<(), String> {
    for p in &paths {
        let path = Path::new(p);
        if !path.exists() {
            return Err(format!("Path does not exist: {}", p));
        }
    }

    // Use PowerShell to send files to Recycle Bin via Shell.Application COM
    for p in &paths {
        let escaped = p.replace('\'', "''");
        let script = format!(
            "$shell = New-Object -ComObject Shell.Application; \
             $item = $shell.Namespace(0).ParseName('{}'); \
             if ($item) {{ $item.InvokeVerb('delete') }}",
            escaped
        );
        let output = std::process::Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .output()
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to delete {}: {}", p, stderr));
        }
    }

    Ok(())
}

#[tauri::command]
pub fn open_in_explorer(path: String) -> Result<(), String> {
    std::process::Command::new("explorer")
        .arg("/select,")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn copy_files(sources: Vec<String>, dest: String) -> Result<(), String> {
    let dest_path = Path::new(&dest);
    if !dest_path.is_dir() {
        return Err(format!("Destination is not a directory: {}", dest));
    }

    for src in &sources {
        let src_path = Path::new(src);
        let file_name = src_path
            .file_name()
            .ok_or_else(|| format!("Invalid source path: {}", src))?;
        let target = dest_path.join(file_name);

        if src_path.is_dir() {
            copy_dir_recursive(src_path, &target)?;
        } else {
            std::fs::copy(src_path, &target).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn move_files(sources: Vec<String>, dest: String) -> Result<(), String> {
    let dest_path = Path::new(&dest);
    if !dest_path.is_dir() {
        return Err(format!("Destination is not a directory: {}", dest));
    }

    for src in &sources {
        let src_path = Path::new(src);
        let file_name = src_path
            .file_name()
            .ok_or_else(|| format!("Invalid source path: {}", src))?;
        let target = dest_path.join(file_name);

        std::fs::rename(src_path, &target).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn rename_file(path: String, new_name: String) -> Result<String, String> {
    let src = Path::new(&path);
    if !src.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    let parent = src.parent().ok_or("No parent directory")?;
    let target = parent.join(&new_name);
    std::fs::rename(src, &target).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn resolve_shortcut(path: String) -> Result<Option<String>, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("");
    if ext.to_lowercase() != "lnk" {
        return Ok(None);
    }
    let escaped = path.replace('\'', "''");
    let script = format!(
        "$sh = New-Object -ComObject WScript.Shell; $sc = $sh.CreateShortcut('{}'); $sc.TargetPath",
        escaped
    );
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        let target = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !target.is_empty() {
            return Ok(Some(target));
        }
    }
    Ok(None)
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in std::fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let target = dst.join(entry.file_name());
        if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            copy_dir_recursive(&entry.path(), &target)?;
        } else {
            std::fs::copy(entry.path(), &target).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
