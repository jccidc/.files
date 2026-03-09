use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

fn fonts_dir() -> Result<PathBuf, String> {
    let config = dirs::config_dir().ok_or("Could not determine config directory")?;
    Ok(config.join(".files").join("fonts"))
}

fn family_from_filename(name: &str) -> String {
    let stem = match name.rsplit_once('.') {
        Some((s, _)) => s,
        None => name,
    };
    let suffixes = ["-Regular", "-Bold", "-Italic", "-BoldItalic", "-Light", "-Medium",
                    "-SemiBold", "-ExtraBold", "-Thin", "-ExtraLight", "-Black",
                    " Regular", " Bold", " Italic", " BoldItalic", " Light", " Medium"];
    let mut result = stem.to_string();
    for s in &suffixes {
        if let Some(stripped) = result.strip_suffix(s) {
            result = stripped.to_string();
            break;
        }
    }
    result
}

#[tauri::command]
pub fn list_system_fonts() -> Result<Vec<String>, String> {
    let mut families = BTreeSet::new();
    let mut dirs_to_scan: Vec<PathBuf> = vec![];

    if let Ok(windir) = std::env::var("WINDIR") {
        dirs_to_scan.push(PathBuf::from(windir).join("Fonts"));
    }
    if let Some(local) = dirs::data_local_dir() {
        dirs_to_scan.push(local.join("Microsoft").join("Windows").join("Fonts"));
    }

    let valid_exts = ["ttf", "otf", "woff2", "ttc"];

    for dir in dirs_to_scan {
        if !dir.exists() { continue; }
        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    if valid_exts.contains(&ext.to_lowercase().as_str()) {
                        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                            families.insert(family_from_filename(name));
                        }
                    }
                }
            }
        }
    }

    Ok(families.into_iter().collect())
}

#[tauri::command]
pub fn install_custom_font(source_path: String) -> Result<serde_json::Value, String> {
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err("Font file not found".to_string());
    }
    let filename = source.file_name()
        .ok_or("Invalid filename")?
        .to_str()
        .ok_or("Invalid filename encoding")?
        .to_string();

    let dest_dir = fonts_dir()?;
    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let dest = dest_dir.join(&filename);
    fs::copy(&source, &dest).map_err(|e| e.to_string())?;

    let family = family_from_filename(&filename);

    Ok(serde_json::json!({
        "name": family,
        "file": filename
    }))
}

#[tauri::command]
pub fn remove_custom_font(filename: String) -> Result<(), String> {
    let dest = fonts_dir()?.join(&filename);
    if dest.exists() {
        fs::remove_file(&dest).map_err(|e| e.to_string())?;
    }
    Ok(())
}
