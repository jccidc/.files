use std::path::Path;
use std::io::{Read as IoRead, Write as IoWrite};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Get list of apps that can open a given file type via Windows "Open With" registry
#[tauri::command]
pub fn get_open_with_apps(path: String) -> Result<Vec<(String, String)>, String> {
    let ext = Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    if ext.is_empty() {
        return Ok(vec![]);
    }

    // Query Windows for apps associated with this extension
    let script = format!(
        r#"
        $ext = '.{ext}'
        $results = @()
        # Check OpenWithProgids
        $key = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\$ext\OpenWithProgids"
        if (Test-Path $key) {{
            (Get-Item $key).GetValueNames() | ForEach-Object {{
                if ($_ -ne '(default)' -and $_ -ne '') {{
                    $results += $_
                }}
            }}
        }}
        # Check OpenWithList
        $key2 = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\$ext\OpenWithList"
        if (Test-Path $key2) {{
            (Get-ItemProperty $key2).PSObject.Properties | Where-Object {{ $_.Name -match '^[a-z]$' }} | ForEach-Object {{
                $results += $_.Value
            }}
        }}
        $results | Select-Object -Unique | ForEach-Object {{ Write-Output $_ }}
        "#,
        ext = ext
    );

    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let apps: Vec<(String, String)> = stdout
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|l| {
            let name = l.trim().to_string();
            (name.clone(), name)
        })
        .collect();

    Ok(apps)
}

/// Open a file with a specific application
#[tauri::command]
pub fn open_with(path: String, app: String) -> Result<(), String> {
    // Try to use "start" with the app name, or shell verb
    std::process::Command::new("cmd")
        .args(["/C", "start", "", &app, &path])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Open the Windows "Open With" dialog for a file
#[tauri::command]
pub fn open_with_dialog(path: String) -> Result<(), String> {
    let escaped = path.replace('\'', "''");
    let script = format!(
        r#"
        $shell = New-Object -ComObject Shell.Application
        $folder = $shell.Namespace((Split-Path '{}'))
        $item = $folder.ParseName((Split-Path '{}' -Leaf))
        if ($item) {{ $item.InvokeVerb('openas') }}
        "#,
        escaped, escaped
    );
    std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Get the user's Send To folder items
#[tauri::command]
pub fn get_send_to_items() -> Result<Vec<(String, String)>, String> {
    let send_to = dirs::config_dir()
        .ok_or("Cannot find AppData")?
        .parent()
        .ok_or("Cannot find parent")?
        .join("Roaming")
        .join("Microsoft")
        .join("Windows")
        .join("SendTo");

    if !send_to.is_dir() {
        // Try alternate path
        let alt = std::env::var("APPDATA")
            .map(|a| Path::new(&a).join("Microsoft").join("Windows").join("SendTo"))
            .map_err(|e| e.to_string())?;
        if !alt.is_dir() {
            return Ok(vec![]);
        }
    }

    let send_to_path = std::env::var("APPDATA")
        .map(|a| Path::new(&a).join("Microsoft").join("Windows").join("SendTo").to_string_lossy().to_string())
        .unwrap_or_default();

    let mut items = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&send_to_path) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            let path = entry.path().to_string_lossy().to_string();
            // Strip .lnk extension for display
            let display = name.replace(".lnk", "").replace(".LNK", "");
            items.push((display, path));
        }
    }
    Ok(items)
}

/// Send a file via a Send To target (invoke the shortcut)
#[tauri::command]
pub fn send_to(file_path: String, target_path: String) -> Result<(), String> {
    std::process::Command::new("cmd")
        .args(["/C", "start", "", &target_path, &file_path])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Compress files/folders into a ZIP archive
#[tauri::command]
pub fn compress_to_zip(sources: Vec<String>, dest_zip: String) -> Result<String, String> {
    let zip_path = Path::new(&dest_zip);
    let file = std::fs::File::create(zip_path).map_err(|e| e.to_string())?;
    let mut zip_writer = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    for source in &sources {
        let src_path = Path::new(source);
        if src_path.is_dir() {
            add_dir_to_zip(&mut zip_writer, src_path, src_path.parent().unwrap_or(src_path), &options)?;
        } else {
            let name = src_path.file_name().unwrap_or_default().to_string_lossy().to_string();
            zip_writer.start_file(&name, options).map_err(|e| e.to_string())?;
            let mut f = std::fs::File::open(src_path).map_err(|e| e.to_string())?;
            let mut buf = Vec::new();
            f.read_to_end(&mut buf).map_err(|e| e.to_string())?;
            zip_writer.write_all(&buf).map_err(|e| e.to_string())?;
        }
    }

    zip_writer.finish().map_err(|e| e.to_string())?;
    Ok(dest_zip)
}

fn add_dir_to_zip(
    writer: &mut zip::ZipWriter<std::fs::File>,
    dir: &Path,
    base: &Path,
    options: &zip::write::SimpleFileOptions,
) -> Result<(), String> {
    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let rel = path.strip_prefix(base).map_err(|e| e.to_string())?;
        let rel_str = rel.to_string_lossy().replace('\\', "/");

        if path.is_dir() {
            writer.add_directory(&format!("{}/", rel_str), *options).map_err(|e| e.to_string())?;
            add_dir_to_zip(writer, &path, base, options)?;
        } else {
            writer.start_file(&rel_str, *options).map_err(|e| e.to_string())?;
            let mut f = std::fs::File::open(&path).map_err(|e| e.to_string())?;
            let mut buf = Vec::new();
            f.read_to_end(&mut buf).map_err(|e| e.to_string())?;
            writer.write_all(&buf).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Extract a ZIP archive
#[tauri::command]
pub fn extract_zip(zip_path: String, dest_dir: String) -> Result<String, String> {
    let file = std::fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    let dest = Path::new(&dest_dir);

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = dest.join(entry.mangled_name());

        if entry.is_dir() {
            std::fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = outpath.parent() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut outfile = std::fs::File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut outfile).map_err(|e| e.to_string())?;
        }
    }

    Ok(dest_dir)
}

/// Create a Windows shortcut (.lnk file)
#[tauri::command]
pub fn create_shortcut(target_path: String, shortcut_path: String) -> Result<(), String> {
    let target_escaped = target_path.replace('\'', "''");
    let shortcut_escaped = shortcut_path.replace('\'', "''");
    let script = format!(
        "$sh = New-Object -ComObject WScript.Shell; $sc = $sh.CreateShortcut('{}'); $sc.TargetPath = '{}'; $sc.Save()",
        shortcut_escaped, target_escaped
    );
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to create shortcut: {}", stderr));
    }
    Ok(())
}

/// List subdirectories of a path (for breadcrumb dropdowns)
#[tauri::command]
pub fn list_subdirs(path: String) -> Result<Vec<String>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Ok(vec![]);
    }
    let mut dirs = Vec::new();
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            if let Ok(ft) = entry.file_type() {
                if ft.is_dir() {
                    dirs.push(entry.file_name().to_string_lossy().to_string());
                }
            }
        }
    }
    dirs.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Ok(dirs)
}
