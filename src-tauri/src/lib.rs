mod commands;
mod models;
mod utils;

use commands::{cloud, filesystem, git, search, settings, shell, terminal, watcher};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            filesystem::read_dir,
            filesystem::stat_file,
            filesystem::get_drives,
            filesystem::read_text_file,
            filesystem::dir_stats,
            filesystem::get_known_folder_paths,
            terminal::spawn_pty,
            terminal::write_pty,
            terminal::resize_pty,
            terminal::kill_pty,
            settings::load_settings,
            settings::save_settings,
            watcher::watch_dir,
            watcher::unwatch_dir,
            search::fuzzy_find,
            shell::delete_to_trash,
            shell::open_in_explorer,
            shell::copy_files,
            shell::move_files,
            shell::rename_file,
            shell::resolve_shortcut,
            git::git_repo_info,
            git::git_status,
            git::git_stage,
            git::git_unstage,
            git::git_commit,
            git::git_log,
            git::git_diff,
            git::git_branches,
            git::git_discard,
            git::git_push,
            git::git_pull,
            git::git_checkout,
            git::git_clone,
            cloud::github_list_repos,
            cloud::detect_cloud_mounts,
            cloud::find_local_repo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
