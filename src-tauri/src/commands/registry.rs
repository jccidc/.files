use winreg::enums::*;
use winreg::RegKey;

/// Check if .files is the default folder handler
#[tauri::command]
pub fn is_default_folder_handler() -> Result<bool, String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let key = hkcu
        .open_subkey(r"Software\Classes\Directory\shell")
        .map_err(|e| e.to_string())?;
    let val: Result<String, _> = key.get_value("");
    Ok(val.map(|v| v == "dotfiles").unwrap_or(false))
}

/// Set or unset .files as the default folder handler
#[tauri::command]
pub fn set_default_folder_handler(enable: bool) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    if enable {
        // Set .files as default verb for directories
        let (key, _) = hkcu
            .create_subkey(r"Software\Classes\Directory\shell")
            .map_err(|e| e.to_string())?;
        key.set_value("", &"dotfiles").map_err(|e| e.to_string())?;

        // Register the dotfiles verb with exe path
        let exe_path = std::env::current_exe()
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .to_string();

        let (verb_key, _) = hkcu
            .create_subkey(r"Software\Classes\Directory\shell\dotfiles")
            .map_err(|e| e.to_string())?;
        verb_key.set_value("", &"Open with .files").map_err(|e| e.to_string())?;
        verb_key.set_value("Icon", &exe_path).map_err(|e| e.to_string())?;

        let (cmd_key, _) = hkcu
            .create_subkey(r"Software\Classes\Directory\shell\dotfiles\command")
            .map_err(|e| e.to_string())?;
        let cmd = format!("\"{}\" \"%1\"", exe_path);
        cmd_key.set_value("", &cmd).map_err(|e| e.to_string())?;
    } else {
        // Remove default verb (revert to Explorer)
        let key = hkcu
            .open_subkey_with_flags(r"Software\Classes\Directory\shell", KEY_SET_VALUE)
            .map_err(|e| e.to_string())?;
        // Delete the default value to revert
        let _ = key.delete_value("");

        // Remove the dotfiles verb entirely
        let _ = hkcu.delete_subkey_all(r"Software\Classes\Directory\shell\dotfiles");
    }

    Ok(())
}
