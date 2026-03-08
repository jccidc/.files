use git2::{
    BranchType, Delta, DiffOptions, ErrorCode, Repository, StatusOptions, StatusShow,
};
use serde::Serialize;
use std::path::Path;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

// ---- Models ----

#[derive(Debug, Clone, Serialize)]
pub struct GitRepoInfo {
    pub is_repo: bool,
    pub root: Option<String>,
    pub branch: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub has_remote: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String, // "modified", "added", "deleted", "renamed", "untracked", "conflict", "typechange"
    pub staged: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitStatusResult {
    pub files: Vec<GitFileStatus>,
    pub branch: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub has_remote: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitLogEntry {
    pub id: String,
    pub short_id: String,
    pub message: String,
    pub author: String,
    pub email: String,
    pub time: i64,
    pub time_offset: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitDiffResult {
    pub files: Vec<GitDiffFile>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitDiffFile {
    pub path: String,
    pub old_path: Option<String>,
    pub status: String,
    pub hunks: Vec<GitDiffHunk>,
    pub additions: u32,
    pub deletions: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitDiffHunk {
    pub header: String,
    pub lines: Vec<GitDiffLine>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitDiffLine {
    pub origin: String, // "+", "-", " "
    pub content: String,
    pub old_lineno: Option<u32>,
    pub new_lineno: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GitBranch {
    pub name: String,
    pub is_head: bool,
    pub is_remote: bool,
    pub upstream: Option<String>,
}

// ---- Helpers ----

fn find_repo(path: &str) -> Result<Repository, String> {
    Repository::discover(path).map_err(|e| format!("Not a git repository: {}", e))
}

fn get_branch_name(repo: &Repository) -> Option<String> {
    repo.head()
        .ok()
        .and_then(|h| h.shorthand().map(|s| s.to_string()))
}

fn get_ahead_behind(repo: &Repository) -> (u32, u32) {
    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => return (0, 0),
    };
    let local_oid = match head.target() {
        Some(o) => o,
        None => return (0, 0),
    };

    let branch_name = match head.shorthand() {
        Some(n) => n.to_string(),
        None => return (0, 0),
    };

    let upstream_name = format!("refs/remotes/origin/{}", branch_name);
    let upstream_ref = match repo.find_reference(&upstream_name) {
        Ok(r) => r,
        Err(_) => return (0, 0),
    };
    let upstream_oid = match upstream_ref.target() {
        Some(o) => o,
        None => return (0, 0),
    };

    repo.graph_ahead_behind(local_oid, upstream_oid)
        .map(|(a, b)| (a as u32, b as u32))
        .unwrap_or((0, 0))
}

fn delta_to_string(delta: Delta) -> &'static str {
    match delta {
        Delta::Added => "added",
        Delta::Deleted => "deleted",
        Delta::Modified => "modified",
        Delta::Renamed => "renamed",
        Delta::Copied => "copied",
        Delta::Typechange => "typechange",
        Delta::Conflicted => "conflict",
        _ => "unknown",
    }
}

// ---- Commands ----

#[tauri::command]
pub fn git_repo_info(path: String) -> GitRepoInfo {
    match Repository::discover(&path) {
        Ok(repo) => {
            let root = repo
                .workdir()
                .map(|p| p.to_string_lossy().to_string());
            let branch = get_branch_name(&repo);
            let (ahead, behind) = get_ahead_behind(&repo);
            let has_remote = repo.find_remote("origin").is_ok();
            GitRepoInfo {
                is_repo: true,
                root,
                branch,
                ahead,
                behind,
                has_remote,
            }
        }
        Err(_) => GitRepoInfo {
            is_repo: false,
            root: None,
            branch: None,
            ahead: 0,
            behind: 0,
            has_remote: false,
        },
    }
}

#[tauri::command]
pub fn git_status(path: String) -> Result<GitStatusResult, String> {
    let repo = find_repo(&path)?;
    let branch = get_branch_name(&repo);
    let (ahead, behind) = get_ahead_behind(&repo);
    let has_remote = repo.find_remote("origin").is_ok();

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);

    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;
    let mut files = Vec::new();

    for entry in statuses.iter() {
        let path_str = entry.path().unwrap_or("").to_string();
        let s = entry.status();

        // Index (staged) statuses
        if s.is_index_new() {
            files.push(GitFileStatus { path: path_str.clone(), status: "added".into(), staged: true });
        }
        if s.is_index_modified() {
            files.push(GitFileStatus { path: path_str.clone(), status: "modified".into(), staged: true });
        }
        if s.is_index_deleted() {
            files.push(GitFileStatus { path: path_str.clone(), status: "deleted".into(), staged: true });
        }
        if s.is_index_renamed() {
            files.push(GitFileStatus { path: path_str.clone(), status: "renamed".into(), staged: true });
        }
        if s.is_index_typechange() {
            files.push(GitFileStatus { path: path_str.clone(), status: "typechange".into(), staged: true });
        }

        // Worktree (unstaged) statuses
        if s.is_wt_modified() {
            files.push(GitFileStatus { path: path_str.clone(), status: "modified".into(), staged: false });
        }
        if s.is_wt_deleted() {
            files.push(GitFileStatus { path: path_str.clone(), status: "deleted".into(), staged: false });
        }
        if s.is_wt_renamed() {
            files.push(GitFileStatus { path: path_str.clone(), status: "renamed".into(), staged: false });
        }
        if s.is_wt_typechange() {
            files.push(GitFileStatus { path: path_str.clone(), status: "typechange".into(), staged: false });
        }
        if s.is_wt_new() {
            files.push(GitFileStatus { path: path_str.clone(), status: "untracked".into(), staged: false });
        }
        if s.is_conflicted() {
            files.push(GitFileStatus { path: path_str.clone(), status: "conflict".into(), staged: false });
        }
    }

    Ok(GitStatusResult { files, branch, ahead, behind, has_remote })
}

#[tauri::command]
pub fn git_stage(path: String, files: Vec<String>) -> Result<(), String> {
    let repo = find_repo(&path)?;
    let mut index = repo.index().map_err(|e| e.to_string())?;

    for file_path in &files {
        let rel = Path::new(file_path);
        // Check if file exists on disk
        let workdir = repo.workdir().ok_or("No workdir")?;
        let abs = workdir.join(rel);
        if abs.exists() {
            index.add_path(rel).map_err(|e| format!("Stage {}: {}", file_path, e))?;
        } else {
            // File was deleted, remove from index
            index.remove_path(rel).map_err(|e| format!("Stage delete {}: {}", file_path, e))?;
        }
    }
    index.write().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_unstage(path: String, files: Vec<String>) -> Result<(), String> {
    let repo = find_repo(&path)?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let head_commit = head.peel_to_commit().map_err(|e| e.to_string())?;
    let head_tree = head_commit.tree().map_err(|e| e.to_string())?;

    let mut index = repo.index().map_err(|e| e.to_string())?;

    for file_path in &files {
        let rel = Path::new(file_path);
        // Reset to HEAD state
        match head_tree.get_path(rel) {
            Ok(entry) => {
                let idx_entry = git2::IndexEntry {
                    ctime: git2::IndexTime::new(0, 0),
                    mtime: git2::IndexTime::new(0, 0),
                    dev: 0,
                    ino: 0,
                    mode: entry.filemode() as u32,
                    uid: 0,
                    gid: 0,
                    file_size: 0,
                    id: entry.id(),
                    flags: 0,
                    flags_extended: 0,
                    path: file_path.as_bytes().to_vec(),
                };
                index.add(&idx_entry).map_err(|e| format!("Unstage {}: {}", file_path, e))?;
            }
            Err(_) => {
                // File not in HEAD = was newly added, just remove from index
                index.remove_path(rel).map_err(|e| format!("Unstage new {}: {}", file_path, e))?;
            }
        }
    }
    index.write().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn git_commit(path: String, message: String) -> Result<String, String> {
    let repo = find_repo(&path)?;
    let sig = repo.signature().map_err(|e| format!("Git signature not configured: {}", e))?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_oid = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_oid).map_err(|e| e.to_string())?;

    let parent = match repo.head() {
        Ok(h) => Some(h.peel_to_commit().map_err(|e| e.to_string())?),
        Err(e) if e.code() == ErrorCode::UnbornBranch => None,
        Err(e) => return Err(e.to_string()),
    };

    let parents: Vec<&git2::Commit> = parent.iter().collect();
    let oid = repo
        .commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents)
        .map_err(|e| e.to_string())?;

    Ok(oid.to_string())
}

#[tauri::command]
pub fn git_log(path: String, max_count: usize) -> Result<Vec<GitLogEntry>, String> {
    let repo = find_repo(&path)?;
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.push_head().map_err(|e| e.to_string())?;
    revwalk
        .set_sorting(git2::Sort::TIME)
        .map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for (i, oid) in revwalk.enumerate() {
        if i >= max_count {
            break;
        }
        let oid = oid.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
        let id_str = oid.to_string();
        entries.push(GitLogEntry {
            short_id: id_str[..7.min(id_str.len())].to_string(),
            id: id_str,
            message: commit.message().unwrap_or("").to_string(),
            author: commit.author().name().unwrap_or("").to_string(),
            email: commit.author().email().unwrap_or("").to_string(),
            time: commit.time().seconds(),
            time_offset: commit.time().offset_minutes(),
        });
    }
    Ok(entries)
}

#[tauri::command]
pub fn git_diff(path: String, staged: bool) -> Result<GitDiffResult, String> {
    let repo = find_repo(&path)?;
    let mut diff_opts = DiffOptions::new();
    diff_opts.include_untracked(true);

    let diff = if staged {
        let head_tree = repo
            .head()
            .ok()
            .and_then(|h| h.peel_to_tree().ok());
        repo.diff_tree_to_index(head_tree.as_ref(), None, Some(&mut diff_opts))
    } else {
        repo.diff_index_to_workdir(None, Some(&mut diff_opts))
    }
    .map_err(|e| e.to_string())?;

    let mut files: Vec<GitDiffFile> = Vec::new();

    // Process each delta via Patch to avoid borrow conflicts
    let num_deltas = diff.deltas().len();
    for i in 0..num_deltas {
        let delta = diff.deltas().nth(i).unwrap();
        let new_path = delta
            .new_file()
            .path()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();
        let old_path = delta
            .old_file()
            .path()
            .map(|p| p.to_string_lossy().to_string());

        let mut diff_file = GitDiffFile {
            path: new_path,
            old_path: if delta.status() == Delta::Renamed { old_path } else { None },
            status: delta_to_string(delta.status()).to_string(),
            hunks: Vec::new(),
            additions: 0,
            deletions: 0,
        };

        // Get patch for this file
        if let Ok(patch) = git2::Patch::from_diff(&diff, i) {
            if let Some(patch) = patch {
                let num_hunks = patch.num_hunks();
                for h in 0..num_hunks {
                    if let Ok((hunk, num_lines)) = patch.hunk(h) {
                        let header = std::str::from_utf8(hunk.header())
                            .unwrap_or("")
                            .trim_end()
                            .to_string();
                        let mut diff_hunk = GitDiffHunk {
                            header,
                            lines: Vec::new(),
                        };
                        for l in 0..num_lines {
                            if let Ok(line) = patch.line_in_hunk(h, l) {
                                let origin = match line.origin() {
                                    '+' => { diff_file.additions += 1; "+" }
                                    '-' => { diff_file.deletions += 1; "-" }
                                    _ => " ",
                                };
                                diff_hunk.lines.push(GitDiffLine {
                                    origin: origin.to_string(),
                                    content: std::str::from_utf8(line.content())
                                        .unwrap_or("")
                                        .to_string(),
                                    old_lineno: line.old_lineno(),
                                    new_lineno: line.new_lineno(),
                                });
                            }
                        }
                        diff_file.hunks.push(diff_hunk);
                    }
                }
            }
        }

        files.push(diff_file);
    }

    Ok(GitDiffResult { files })
}

#[tauri::command]
pub fn git_branches(path: String) -> Result<Vec<GitBranch>, String> {
    let repo = find_repo(&path)?;
    let mut branches = Vec::new();

    for branch_result in repo.branches(None).map_err(|e| e.to_string())? {
        let (branch, branch_type) = branch_result.map_err(|e| e.to_string())?;
        let name = branch.name().map_err(|e| e.to_string())?;
        let name = name.unwrap_or("").to_string();
        let is_head = branch.is_head();
        let is_remote = branch_type == BranchType::Remote;
        let upstream = branch
            .upstream()
            .ok()
            .and_then(|u| u.name().ok().flatten().map(|s| s.to_string()));

        branches.push(GitBranch {
            name,
            is_head,
            is_remote,
            upstream,
        });
    }

    Ok(branches)
}

#[tauri::command]
pub fn git_discard(path: String, files: Vec<String>) -> Result<(), String> {
    let repo = find_repo(&path)?;
    let mut checkout_builder = git2::build::CheckoutBuilder::new();
    checkout_builder.force();
    for f in &files {
        checkout_builder.path(f);
    }

    repo.checkout_head(Some(&mut checkout_builder))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn git_push(path: String) -> Result<String, String> {
    let repo = find_repo(&path)?;
    let workdir = repo.workdir().ok_or("No workdir")?.to_string_lossy().to_string();

    let output = std::process::Command::new("git")
        .args(["push"])
        .current_dir(&workdir)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to run git push: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Ok(format!("{}{}", stdout, stderr).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("git push failed: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn git_pull(path: String) -> Result<String, String> {
    let repo = find_repo(&path)?;
    let workdir = repo.workdir().ok_or("No workdir")?.to_string_lossy().to_string();

    let output = std::process::Command::new("git")
        .args(["pull"])
        .current_dir(&workdir)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to run git pull: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Ok(format!("{}{}", stdout, stderr).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("git pull failed: {}", stderr.trim()))
    }
}

fn is_valid_branch_name(name: &str) -> bool {
    !name.is_empty()
        && !name.contains(|c: char| c.is_whitespace())
        && !name.contains("..")
        && !name.contains('~')
        && !name.contains('^')
        && !name.contains(':')
        && !name.contains('\\')
        && !name.contains('*')
        && !name.contains('?')
        && !name.contains('[')
        && !name.starts_with('-')
        && !name.ends_with('/')
        && !name.ends_with(".lock")
}

#[tauri::command]
pub async fn git_checkout(path: String, branch: String) -> Result<String, String> {
    if !is_valid_branch_name(&branch) {
        return Err("Invalid branch name".to_string());
    }

    let repo = find_repo(&path)?;
    let workdir = repo.workdir().ok_or("No workdir")?.to_string_lossy().to_string();

    let output = std::process::Command::new("git")
        .args(["checkout", &branch])
        .current_dir(&workdir)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to run git checkout: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Ok(format!("{}{}", stdout, stderr).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("git checkout failed: {}", stderr.trim()))
    }
}

#[tauri::command]
pub async fn git_clone(url: String, target_dir: String) -> Result<String, String> {
    let output = std::process::Command::new("git")
        .args(["clone", &url, &target_dir])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to run git clone: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Ok(format!("{}{}", stdout, stderr).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("git clone failed: {}", stderr.trim()))
    }
}
