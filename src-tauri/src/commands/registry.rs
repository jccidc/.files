use winreg::enums::*;
use winreg::RegKey;

const APP_NAME: &str = "dotfiles";
const APP_DISPLAY: &str = ".files";

fn get_exe_path() -> Result<String, String> {
    Ok(std::env::current_exe()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string())
}

/// Find the best icon path for registry entries.
/// Prefers icon.ico next to the exe (always has the correct icon),
/// falls back to exe resource index 0.
fn get_icon_path(exe_path: &str) -> String {
    let exe = std::path::Path::new(exe_path);
    if let Some(dir) = exe.parent() {
        // In installed builds: icons/ is a sibling of the exe
        let ico = dir.join("icons").join("icon.ico");
        if ico.exists() {
            return ico.to_string_lossy().to_string();
        }
        // In dev builds: icon.ico might be in the tauri source
        let dev_ico = dir
            .ancestors()
            .find_map(|ancestor| {
                let p = ancestor.join("icons").join("icon.ico");
                p.exists().then(|| p.to_string_lossy().to_string())
            });
        if let Some(path) = dev_ico {
            return path;
        }
    }
    // Fallback: extract icon from exe resource
    format!("{},0", exe_path)
}

/// Restore original behavior by removing the entire HKCU override.
/// HKLM values (Explorer + DelegateExecute) will take effect again via HKCR merge.
fn restore_open_command(hkcu: &RegKey, class: &str) {
    // Delete the entire open\command key from HKCU so HKLM defaults apply
    let _ = hkcu.delete_subkey_all(format!(r"Software\Classes\{}\shell\open\command", class));
    // Also clean up the open key if empty
    let _ = hkcu.delete_subkey(format!(r"Software\Classes\{}\shell\open", class));
}

/// Override the `open` verb for a given shell class to launch .files.
///
/// Two things must happen:
/// 1. Set the command string to our exe
/// 2. Set DelegateExecute to "" (empty) in HKCU -- this overrides HKLM's COM CLSID
///    in the merged HKCR view. If DelegateExecute has any non-empty value, Windows
///    ignores the command string entirely and delegates to Explorer's COM handler.
///    We can't delete the HKLM value (needs admin), but HKCU empty string wins.
fn set_open_command(hkcu: &RegKey, class: &str, exe_path: &str) -> Result<(), String> {
    let cmd_path = format!(r"Software\Classes\{}\shell\open\command", class);
    let (cmd_key, _) = hkcu
        .create_subkey(&cmd_path)
        .map_err(|e| e.to_string())?;
    cmd_key
        .set_value("", &format!("\"{}\" \"%1\"", exe_path))
        .map_err(|e| e.to_string())?;

    // Override DelegateExecute with empty string -- HKCU wins over HKLM in merged HKCR
    cmd_key
        .set_value("DelegateExecute", &"")
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Remove DelegateExecute is critical -- this COM CLSID is what makes Windows
/// ignore our command and use Explorer instead. We also need to keep the
/// "Open with .files" context menu entry for right-click.
fn set_context_menu_entry(hkcu: &RegKey, class: &str, exe_path: &str) -> Result<(), String> {
    let icon_path = get_icon_path(exe_path);
    // Add "Open with .files" as a separate verb (for right-click menu)
    let verb_path = format!(r"Software\Classes\{}\shell\dotfiles", class);
    let (verb_key, _) = hkcu.create_subkey(&verb_path).map_err(|e| e.to_string())?;
    verb_key
        .set_value("", &"Open with .files")
        .map_err(|e| e.to_string())?;
    verb_key
        .set_value("Icon", &icon_path)
        .map_err(|e| e.to_string())?;

    let (cmd_key, _) = hkcu
        .create_subkey(format!(r"{}\command", verb_path))
        .map_err(|e| e.to_string())?;
    cmd_key
        .set_value("", &format!("\"{}\" \"%1\"", exe_path))
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Remove context menu entry for a shell class
fn remove_context_menu_entry(hkcu: &RegKey, class: &str) {
    let _ = hkcu.delete_subkey_all(format!(r"Software\Classes\{}\shell\dotfiles", class));
}

/// Check if .files is the default folder handler
#[tauri::command]
pub fn is_default_folder_handler() -> Result<bool, String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    // Check if Directory\shell\open\command points to our exe
    let cmd_path = r"Software\Classes\Directory\shell\open\command";
    if let Ok(cmd_key) = hkcu.open_subkey(cmd_path) {
        if let Ok(val) = cmd_key.get_value::<String, _>("") {
            return Ok(val.contains("dotfiles"));
        }
    }
    Ok(false)
}

/// Set or unset .files as the default folder handler.
///
/// This works by overriding the `open` verb on Directory, Drive, and Folder
/// shell classes. The key trick is removing `DelegateExecute` -- a COM CLSID
/// that tells Windows to ignore the command string and use Explorer's internal
/// handler instead.
#[tauri::command]
pub fn set_default_folder_handler(enable: bool) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let exe_path = get_exe_path()?;

    // All three classes need to be overridden for complete folder handling:
    // - Directory: regular folders
    // - Drive: drive roots (C:\, D:\, etc.)
    // - Folder: virtual/special folders
    let classes = ["Directory", "Drive", "Folder"];

    if enable {
        for class in &classes {
            // Override the open verb to launch .files
            set_open_command(&hkcu, class, &exe_path)?;
            // Also add "Open with .files" context menu entry
            set_context_menu_entry(&hkcu, class, &exe_path)?;
        }
        notify_shell_change();
    } else {
        for class in &classes {
            // Remove HKCU override -- HKLM Explorer defaults will apply
            restore_open_command(&hkcu, class);
            // Remove context menu entry
            remove_context_menu_entry(&hkcu, class);
        }
        notify_shell_change();
    }

    Ok(())
}

/// Tell Windows the file associations changed so Explorer picks up the change
fn notify_shell_change() {
    use std::ffi::c_void;
    #[link(name = "shell32")]
    extern "system" {
        fn SHChangeNotify(
            wEventId: i32,
            uFlags: u32,
            dwItem1: *const c_void,
            dwItem2: *const c_void,
        );
    }
    // SHCNE_ASSOCCHANGED = 0x08000000, SHCNF_IDLIST = 0
    unsafe {
        SHChangeNotify(0x08000000, 0, std::ptr::null(), std::ptr::null());
    }
}
