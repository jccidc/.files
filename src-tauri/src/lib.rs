mod commands;
mod models;
mod utils;

use commands::{filesystem, search, settings, shell, terminal, watcher};

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
