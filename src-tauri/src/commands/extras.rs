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

/// Fetch current weather using Open-Meteo API (free, no key needed)
/// unit: "f" for Fahrenheit, "c" for Celsius
#[tauri::command]
pub async fn get_weather(zip: String, unit: String) -> Result<(String, String, String), String> {
    // Step 1: Geocode the zip/city using Open-Meteo geocoding
    let geo_query = if zip.is_empty() { "auto".to_string() } else { zip.clone() };
    let geo_url = format!(
        "https://geocoding-api.open-meteo.com/v1/search?name={}&count=1&language=en&format=json",
        geo_query
    );

    let (lat, lon) = if zip.chars().all(|c| c.is_ascii_digit()) && zip.len() == 5 {
        // US zip code — use a zip-to-coords approach via nominatim
        let nom_url = format!(
            "https://nominatim.openstreetmap.org/search?postalcode={}&country=US&format=json&limit=1",
            zip
        );
        let resp = reqwest::Client::new()
            .get(&nom_url)
            .header("User-Agent", "dotfiles-app/1.0")
            .send().await.map_err(|e| e.to_string())?;
        let body = resp.text().await.map_err(|e| e.to_string())?;
        let parsed: serde_json::Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;
        if let Some(first) = parsed.as_array().and_then(|a| a.first()) {
            let lat = first["lat"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0);
            let lon = first["lon"].as_str().unwrap_or("0").parse::<f64>().unwrap_or(0.0);
            (lat, lon)
        } else {
            return Err("Could not geocode zip code".into());
        }
    } else {
        // Try as city name
        let resp = reqwest::get(&geo_url).await.map_err(|e| e.to_string())?;
        let body = resp.text().await.map_err(|e| e.to_string())?;
        let parsed: serde_json::Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;
        if let Some(first) = parsed["results"].as_array().and_then(|a| a.first()) {
            let lat = first["latitude"].as_f64().unwrap_or(0.0);
            let lon = first["longitude"].as_f64().unwrap_or(0.0);
            (lat, lon)
        } else {
            return Err("Could not geocode location".into());
        }
    };

    // Step 2: Get weather from Open-Meteo
    let temp_unit = if unit == "c" { "celsius" } else { "fahrenheit" };
    let weather_url = format!(
        "https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}&current=temperature_2m,weather_code&temperature_unit={}",
        lat, lon, temp_unit
    );
    let resp = reqwest::get(&weather_url).await.map_err(|e| e.to_string())?;
    let body = resp.text().await.map_err(|e| e.to_string())?;
    let parsed: serde_json::Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;

    let temp = parsed["current"]["temperature_2m"].as_f64().unwrap_or(0.0);
    let code = parsed["current"]["weather_code"].as_i64().unwrap_or(0);

    let unit_symbol = if unit == "c" { "C" } else { "F" };
    let temp_str = format!("{:.0}°{}", temp, unit_symbol);

    // WMO weather codes → description + emoji
    let (condition, icon) = match code {
        0 => ("Clear", "☀️"),
        1 => ("Mostly Clear", "🌤️"),
        2 => ("Partly Cloudy", "⛅"),
        3 => ("Overcast", "☁️"),
        45 | 48 => ("Foggy", "🌫️"),
        51 | 53 | 55 => ("Drizzle", "🌦️"),
        61 | 63 | 65 => ("Rain", "🌧️"),
        66 | 67 => ("Freezing Rain", "🌨️"),
        71 | 73 | 75 => ("Snow", "❄️"),
        77 => ("Snow Grains", "❄️"),
        80 | 81 | 82 => ("Showers", "🌧️"),
        85 | 86 => ("Snow Showers", "🌨️"),
        95 => ("Thunderstorm", "⛈️"),
        96 | 99 => ("Thunderstorm + Hail", "⛈️"),
        _ => ("Unknown", "🌡️"),
    };

    Ok((temp_str, condition.to_string(), icon.to_string()))
}

/// Send a media key (prev, play, next)
#[tauri::command]
pub fn send_media_key(key: String) -> Result<(), String> {
    // Virtual key codes: 0xB1=prev, 0xB3=play/pause, 0xB0=next
    let vk = match key.as_str() {
        "prev" => "0xB1",
        "play" => "0xB3",
        "next" => "0xB0",
        _ => return Err(format!("Unknown media key: {}", key)),
    };
    let script = format!(
        r#"
        Add-Type -TypeDefinition '
        using System;
        using System.Runtime.InteropServices;
        public class MediaKey {{
            [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
            public static void Press(byte vk) {{ keybd_event(vk, 0, 0, UIntPtr.Zero); keybd_event(vk, 0, 2, UIntPtr.Zero); }}
        }}
        '
        [MediaKey]::Press({})
        "#,
        vk
    );
    std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Toggle fullscreen
#[tauri::command]
pub fn toggle_fullscreen(window: tauri::WebviewWindow) -> Result<(), String> {
    let is_fullscreen = window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(!is_fullscreen).map_err(|e| e.to_string())?;
    Ok(())
}

/// Get currently playing Spotify track by reading the Spotify window title.
/// Returns (artist, track, is_playing). No API key needed.
#[tauri::command]
pub fn get_spotify_status() -> Result<(String, String, bool), String> {
    let script = r#"
    $spotify = Get-Process -Name Spotify -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowTitle -ne '' -and $_.MainWindowTitle -ne 'Spotify' -and $_.MainWindowTitle -ne 'Spotify Free' -and $_.MainWindowTitle -ne 'Spotify Premium' } |
        Select-Object -First 1
    if ($spotify -and $spotify.MainWindowTitle -match ' - ') {
        Write-Output $spotify.MainWindowTitle
    } else {
        Write-Output ''
    }
    "#;
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    let title = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if title.is_empty() {
        return Ok((String::new(), String::new(), false));
    }

    // Spotify window title format: "Artist - Track"
    let parts: Vec<&str> = title.splitn(2, " - ").collect();
    if parts.len() >= 2 {
        Ok((parts[0].trim().to_string(), parts[1].trim().to_string(), true))
    } else {
        Ok((title, String::new(), true))
    }
}

/// Get system resource usage (CPU %, RAM used/total, battery %)
#[tauri::command]
pub async fn get_system_stats() -> Result<(f32, u64, u64, Option<u32>), String> {
    // CPU, RAM used, RAM total, Battery %
    let script = r#"
    $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
    $os = Get-CimInstance Win32_OperatingSystem
    $ramUsed = $os.TotalVisibleMemorySize - $os.FreePhysicalMemory
    $ramTotal = $os.TotalVisibleMemorySize
    $battery = $null
    $bat = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
    if ($bat) { $battery = $bat.EstimatedChargeRemaining }
    Write-Output "$cpu|$ramUsed|$ramTotal|$battery"
    "#;
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let parts: Vec<&str> = stdout.split('|').collect();
    if parts.len() < 4 {
        return Err("Failed to parse system stats".into());
    }

    let cpu: f32 = parts[0].parse().unwrap_or(0.0);
    let ram_used: u64 = parts[1].parse().unwrap_or(0) * 1024; // KB to bytes
    let ram_total: u64 = parts[2].parse().unwrap_or(0) * 1024;
    let battery: Option<u32> = parts[3].parse().ok();

    Ok((cpu, ram_used, ram_total, battery))
}
