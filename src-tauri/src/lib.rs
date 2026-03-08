mod commands;
mod models;
mod utils;

use commands::{cloud, filesystem, git, registry, search, settings, shell, terminal, watcher};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Emitter, Manager, WindowEvent,
    window::{Effect, EffectState, EffectsBuilder},
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // args[0] is the exe path, args[1..] are CLI arguments
            if args.len() > 1 {
                let folder_path = args[1].clone();
                let _ = app.emit("open-folder", folder_path);
            }
            // Always bring window to front
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Build tray menu
            let show = MenuItemBuilder::with_id("show", "Show .files").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;

            // Use the app's default window icon for tray
            let icon = app.default_window_icon().unwrap().clone();

            TrayIconBuilder::new()
                .icon(icon)
                .tooltip(".files")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                        if let Some(w) = tray.app_handle().get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Minimize to tray on close (hide window instead of exiting)
            let window = app.get_webview_window("main").unwrap();
            // Dev tools: uncomment to debug
            // window.open_devtools();
            let win_handle = window.clone();
            window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = win_handle.hide();
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_window_effect,
            filesystem::read_dir,
            filesystem::stat_file,
            filesystem::get_drives,
            filesystem::read_text_file,
            filesystem::dir_stats,
            filesystem::get_known_folder_paths,
            filesystem::read_file_bytes,
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
            shell::open_file,
            shell::copy_files,
            shell::move_files,
            shell::rename_file,
            shell::resolve_shortcut,
            shell::eject_drive,
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
            registry::is_default_folder_handler,
            registry::set_default_folder_handler,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn set_window_effect(window: tauri::WebviewWindow, effect: String) -> Result<(), String> {
    let effects: Vec<Effect> = match effect.as_str() {
        "mica" => vec![Effect::Mica],
        "mica-alt" => vec![Effect::MicaDark],
        "acrylic" => vec![Effect::Acrylic],
        "tabbed" => vec![Effect::Tabbed],
        _ => vec![],
    };

    if effects.is_empty() {
        window
            .set_effects(EffectsBuilder::new().build())
            .map_err(|e| e.to_string())
    } else {
        window
            .set_effects(
                EffectsBuilder::new()
                    .effects(effects)
                    .state(EffectState::Active) // keep effect when window loses focus
                    .build(),
            )
            .map_err(|e| e.to_string())
    }
}
