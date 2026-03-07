use serde::Serialize;
use std::path::Path;

// ---- Models ----

#[derive(Debug, Clone, Serialize)]
pub struct GitHubRepo {
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub clone_url: String,
    pub ssh_url: String,
    pub html_url: String,
    pub is_private: bool,
    pub default_branch: String,
    pub language: Option<String>,
    pub stargazers_count: u32,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CloudMount {
    pub provider: String, // "onedrive", "gdrive", "dropbox"
    pub label: String,
    pub path: String,
}

// ---- GitHub API ----

#[tauri::command]
pub async fn github_list_repos(pat: String, page: u32) -> Result<Vec<GitHubRepo>, String> {
    if pat.trim().is_empty() {
        return Err("GitHub PAT is required".into());
    }

    let client = reqwest::Client::new();
    let resp = client
        .get("https://api.github.com/user/repos")
        .query(&[
            ("per_page", "50"),
            ("page", &page.to_string()),
            ("sort", "updated"),
            ("affiliation", "owner,collaborator,organization_member"),
        ])
        .header("Authorization", format!("Bearer {}", pat.trim()))
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "dotfiles-app/0.1")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .send()
        .await
        .map_err(|e| format!("GitHub API request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("GitHub API error {}: {}", status, body));
    }

    let repos: Vec<serde_json::Value> = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse GitHub response: {}", e))?;

    let result = repos
        .into_iter()
        .map(|r| GitHubRepo {
            name: r["name"].as_str().unwrap_or("").to_string(),
            full_name: r["full_name"].as_str().unwrap_or("").to_string(),
            description: r["description"].as_str().map(|s| s.to_string()),
            clone_url: r["clone_url"].as_str().unwrap_or("").to_string(),
            ssh_url: r["ssh_url"].as_str().unwrap_or("").to_string(),
            html_url: r["html_url"].as_str().unwrap_or("").to_string(),
            is_private: r["private"].as_bool().unwrap_or(false),
            default_branch: r["default_branch"].as_str().unwrap_or("main").to_string(),
            language: r["language"].as_str().map(|s| s.to_string()),
            stargazers_count: r["stargazers_count"].as_u64().unwrap_or(0) as u32,
            updated_at: r["updated_at"].as_str().unwrap_or("").to_string(),
        })
        .collect();

    Ok(result)
}

// ---- Find Local Repo ----

#[tauri::command]
pub fn find_local_repo(name: String) -> Option<String> {
    let user_profile = std::env::var("USERPROFILE").unwrap_or_default();
    let candidates = [
        format!("C:\\Projects\\{}", &name),
        format!("{}\\Projects\\{}", &user_profile, &name),
        format!("{}\\Documents\\{}", &user_profile, &name),
        format!("{}\\source\\repos\\{}", &user_profile, &name),
        format!("{}\\OneDrive\\Jimmy CrakCrn\\projects\\{}", &user_profile, &name),
        format!("{}\\repos\\{}", &user_profile, &name),
    ];
    for c in &candidates {
        let p = Path::new(c);
        if p.is_dir() && p.join(".git").is_dir() {
            return Some(c.clone());
        }
    }
    None
}

// ---- Cloud Mount Detection ----

/// Skip Google Drive virtual filesystem roots (contain only .lnk files and "Computers" dir)
fn is_gdfs_root(path: &Path) -> bool {
    if let Ok(entries) = std::fs::read_dir(path) {
        let names: Vec<String> = entries
            .filter_map(|e| e.ok())
            .map(|e| e.file_name().to_string_lossy().to_string())
            .collect();
        // GDFS root typically has "My Drive" (or "My Drive.lnk") and "Computers"
        names.len() <= 5 && names.iter().any(|n| n == "Computers" || n.ends_with(".lnk"))
    } else {
        false
    }
}

/// Resolve a Windows .lnk shortcut to its target path.
/// Returns None if not a .lnk file or resolution fails.
fn resolve_lnk(path: &Path) -> Option<String> {
    let ext = path.extension()?.to_str()?;
    if ext.to_lowercase() != "lnk" {
        return None;
    }
    let escaped = path.to_string_lossy().replace('\'', "''");
    let script = format!(
        "$sh = New-Object -ComObject WScript.Shell; $sc = $sh.CreateShortcut('{}'); $sc.TargetPath",
        escaped
    );
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command", &script])
        .output()
        .ok()?;
    if output.status.success() {
        let target = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !target.is_empty() && Path::new(&target).exists() {
            return Some(target);
        }
    }
    None
}

#[tauri::command]
pub fn detect_cloud_mounts() -> Vec<CloudMount> {
    let mut mounts = Vec::new();

    let user_profile = std::env::var("USERPROFILE").unwrap_or_default();
    if user_profile.is_empty() {
        return mounts;
    }

    // OneDrive - check common paths
    let onedrive_paths = [
        std::env::var("OneDrive").ok(),
        std::env::var("OneDriveConsumer").ok(),
        std::env::var("OneDriveCommercial").ok(),
        Some(format!("{}/OneDrive", &user_profile)),
        Some(format!("{}/OneDrive - Personal", &user_profile)),
    ];
    for od in &onedrive_paths {
        if let Some(p) = od {
            let normalized = p.replace('/', "\\");
            if !normalized.is_empty() && Path::new(&normalized).is_dir() {
                let label = if normalized.contains("Personal") || p.contains("Consumer") {
                    "OneDrive (Personal)".to_string()
                } else if normalized.contains("Commercial") {
                    "OneDrive (Business)".to_string()
                } else {
                    "OneDrive".to_string()
                };
                if !mounts.iter().any(|m: &CloudMount| m.path == normalized) {
                    mounts.push(CloudMount {
                        provider: "onedrive".into(),
                        label,
                        path: normalized,
                    });
                }
            }
        }
    }

    // Google Drive - first try resolving .lnk shortcuts from GDFS roots (G:\, H:\)
    // These resolve to the REAL paths that contain actual files, not virtual GDFS paths
    for drive_letter in &["G:\\", "H:\\"] {
        let root = Path::new(drive_letter);
        if root.is_dir() && is_gdfs_root(root) {
            if let Ok(entries) = std::fs::read_dir(root) {
                for entry in entries.filter_map(|e| e.ok()) {
                    let p = entry.path();
                    if let Some(target) = resolve_lnk(&p) {
                        let target_path = Path::new(&target);
                        if target_path.is_dir() && !mounts.iter().any(|m| m.path == target) {
                            let label = target_path
                                .file_name()
                                .map(|n| format!("Google Drive ({})", n.to_string_lossy()))
                                .unwrap_or_else(|| "Google Drive".into());
                            mounts.push(CloudMount {
                                provider: "gdrive".into(),
                                label,
                                path: target,
                            });
                        }
                    }
                }
            }
        }
    }

    // Fallback: check common non-GDFS Google Drive paths (only if no GDFS mounts found)
    if !mounts.iter().any(|m| m.provider == "gdrive") {
        let gdrive_paths = [
            format!("{}\\Google Drive", &user_profile),
            format!("{}\\My Drive", &user_profile),
        ];
        for gp in &gdrive_paths {
            let normalized = gp.replace('/', "\\");
            if Path::new(&normalized).is_dir() && !is_gdfs_root(Path::new(&normalized)) {
                if !mounts.iter().any(|m| m.path == normalized) {
                    mounts.push(CloudMount {
                        provider: "gdrive".into(),
                        label: "Google Drive".into(),
                        path: normalized,
                    });
                }
            }
        }
    }

    // Dropbox
    let dropbox_paths = [
        format!("{}/Dropbox", &user_profile),
        std::env::var("DROPBOX_DIR").unwrap_or_default(),
    ];
    for dp in &dropbox_paths {
        let normalized = dp.replace('/', "\\");
        if !normalized.is_empty() && Path::new(&normalized).is_dir() {
            if !mounts.iter().any(|m| m.path == normalized) {
                mounts.push(CloudMount {
                    provider: "dropbox".into(),
                    label: "Dropbox".into(),
                    path: normalized,
                });
            }
        }
    }

    mounts
}
