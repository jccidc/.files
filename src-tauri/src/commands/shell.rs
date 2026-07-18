use std::path::Path;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

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
            .creation_flags(CREATE_NO_WINDOW)
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
pub fn open_shell_folder(folder: String) -> Result<(), String> {
    std::process::Command::new("explorer")
        .arg(&folder)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_file(path: String) -> Result<(), String> {
    std::process::Command::new("cmd")
        .args(["/C", "start", "", &path])
        .creation_flags(CREATE_NO_WINDOW)
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

        match std::fs::rename(src_path, &target) {
            Ok(()) => {}
            // ERROR_NOT_SAME_DEVICE (17): rename can't cross volumes — copy, then delete source
            Err(e) if e.raw_os_error() == Some(17) => {
                if src_path.is_dir() {
                    copy_dir_recursive(src_path, &target)?;
                    std::fs::remove_dir_all(src_path).map_err(|e| e.to_string())?;
                } else {
                    std::fs::copy(src_path, &target).map_err(|e| e.to_string())?;
                    std::fs::remove_file(src_path).map_err(|e| e.to_string())?;
                }
            }
            Err(e) => return Err(e.to_string()),
        }
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

/// Friendly type names for extensions, the same way Explorer builds them:
/// HKCR\.ext default value -> ProgID, HKCR\<ProgID> default value -> name
/// (e.g. "Adobe Acrobat Document"). Unregistered types fall back to "EXT File".
#[tauri::command]
pub fn file_type_names(extensions: Vec<String>) -> std::collections::HashMap<String, String> {
    let hkcr = winreg::RegKey::predef(winreg::enums::HKEY_CLASSES_ROOT);
    let mut map = std::collections::HashMap::new();
    for ext in extensions {
        let e = ext.trim_start_matches('.').to_lowercase();
        if e.is_empty() {
            continue;
        }
        let mut name: Option<String> = None;
        if let Ok(key) = hkcr.open_subkey(format!(".{}", e)) {
            if let Ok(progid) = key.get_value::<String, _>("") {
                if !progid.is_empty() {
                    if let Ok(pk) = hkcr.open_subkey(&progid) {
                        if let Ok(desc) = pk.get_value::<String, _>("") {
                            if !desc.is_empty() {
                                name = Some(desc);
                            }
                        }
                    }
                }
            }
        }
        map.insert(e.clone(), name.unwrap_or_else(|| format!("{} File", e.to_uppercase())));
    }
    map
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
        .creation_flags(CREATE_NO_WINDOW)
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

#[tauri::command]
pub fn eject_drive(letter: String) -> Result<(), String> {
    // Extract just the drive letter character
    let drive_char = letter.chars().next().ok_or("Empty drive letter")?;
    if !drive_char.is_ascii_alphabetic() {
        return Err("Invalid drive letter".into());
    }

    let script = format!(
        "(New-Object -ComObject Shell.Application).Namespace(17).ParseName('{}:').InvokeVerb('Eject')",
        drive_char.to_uppercase()
    );
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to eject: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Eject failed: {}", stderr.trim()))
    }
}

#[tauri::command]
pub fn show_properties(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    // Check if this is a drive root (e.g. "C:\")
    let is_drive_root = p.parent().is_none() || p.to_string_lossy().len() <= 3;

    let script = if is_drive_root {
        // Drive roots: use Namespace(17) = "My Computer", then ParseName the drive
        let drive_str = path.replace('\'', "''").trim_end_matches('\\').to_string();
        format!(
            "$shell = New-Object -ComObject Shell.Application; \
             $mypc = $shell.Namespace(17); \
             $item = $mypc.ParseName('{}'); \
             if ($item) {{ $item.InvokeVerb('properties'); Start-Sleep -Seconds 30 }} \
             else {{ \
               $item2 = $mypc.ParseName('{}\\'); \
               if ($item2) {{ $item2.InvokeVerb('properties'); Start-Sleep -Seconds 30 }} \
             }}",
            drive_str, drive_str
        )
    } else {
        let parent = p.parent().unwrap_or(p);
        let name = p.file_name().map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| path.clone());
        let parent_str = parent.to_string_lossy().replace('\'', "''");
        let name_str = name.replace('\'', "''");
        format!(
            "$shell = New-Object -ComObject Shell.Application; \
             $folder = $shell.Namespace('{}'); \
             $item = $folder.ParseName('{}'); \
             if ($item) {{ $item.InvokeVerb('properties'); Start-Sleep -Seconds 30 }}",
            parent_str, name_str
        )
    };

    std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
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
