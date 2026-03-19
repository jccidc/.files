use clipboard_win::{Clipboard, formats::{FileList, RawData}, Getter, Setter, raw};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const DROPEFFECT_COPY: u32 = 0x01;
const DROPEFFECT_MOVE: u32 = 0x02;

fn drop_effect_format() -> u32 {
    raw::register_format("Preferred DropEffect").unwrap().get()
}

/// Copy file paths to the Windows system clipboard using PowerShell Set-Clipboard
#[tauri::command]
pub fn clipboard_copy_files(paths: Vec<String>) -> Result<(), String> {
    // Use Windows Forms Clipboard API via PowerShell for reliable Explorer interop
    let paths_escaped: Vec<String> = paths.iter().map(|p| p.replace('\'', "''")).collect();
    let path_list = paths_escaped.iter()
        .map(|p| format!("'{}'", p))
        .collect::<Vec<_>>()
        .join(",");

    let script = format!(
        r#"
        Add-Type -AssemblyName System.Windows.Forms
        $col = New-Object System.Collections.Specialized.StringCollection
        @({}) | ForEach-Object {{ $col.Add($_) | Out-Null }}
        [System.Windows.Forms.Clipboard]::SetFileDropList($col)
        "#,
        path_list
    );

    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-STA", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Clipboard write failed: {}", stderr));
    }
    Ok(())
}

/// Cut file paths to the Windows system clipboard (copy + set preferred drop effect to MOVE)
#[tauri::command]
pub fn clipboard_cut_files(paths: Vec<String>) -> Result<(), String> {
    let paths_escaped: Vec<String> = paths.iter().map(|p| p.replace('\'', "''")).collect();
    let path_list = paths_escaped.iter()
        .map(|p| format!("'{}'", p))
        .collect::<Vec<_>>()
        .join(",");

    // Set file drop list + preferred drop effect = MOVE
    let script = format!(
        r#"
        Add-Type -AssemblyName System.Windows.Forms
        $data = New-Object System.Windows.Forms.DataObject
        $col = New-Object System.Collections.Specialized.StringCollection
        @({}) | ForEach-Object {{ $col.Add($_) | Out-Null }}
        $data.SetFileDropList($col)
        $ms = New-Object System.IO.MemoryStream(, [byte[]]@(2,0,0,0))
        $data.SetData('Preferred DropEffect', $ms)
        [System.Windows.Forms.Clipboard]::SetDataObject($data, $true)
        "#,
        path_list
    );

    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-STA", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Clipboard cut failed: {}", stderr));
    }
    Ok(())
}

/// Read file paths from the Windows system clipboard.
/// Returns (paths, is_cut) — is_cut is true if the source app did a cut (move), false for copy.
/// Uses PowerShell as primary method since clipboard-win has issues with Explorer's delayed rendering.
#[tauri::command]
pub fn clipboard_read_files() -> Result<(Vec<String>, bool), String> {
    // Try PowerShell first — handles Explorer's delayed rendering reliably
    let script = r#"
    $files = Get-Clipboard -Format FileDropList -ErrorAction SilentlyContinue
    if ($files) {
        $files | ForEach-Object { Write-Output $_.FullName }
    }
    "#;
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-STA", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let files: Vec<String> = stdout
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();

    if !files.is_empty() {
        // Check drop effect for cut vs copy
        let is_cut = check_drop_effect_ps();
        return Ok((files, is_cut));
    }

    // Also try Windows Forms API directly (more reliable for some clipboard states)
    let script2 = r#"
    Add-Type -AssemblyName System.Windows.Forms
    $files = [System.Windows.Forms.Clipboard]::GetFileDropList()
    if ($files) {
        $files | ForEach-Object { Write-Output $_ }
    }
    "#;
    let output2 = std::process::Command::new("powershell")
        .args(["-NoProfile", "-STA", "-Command", script2])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout2 = String::from_utf8_lossy(&output2.stdout);
    let files2: Vec<String> = stdout2
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();

    if !files2.is_empty() {
        let is_cut = check_drop_effect_ps();
        return Ok((files2, is_cut));
    }

    // Fallback: try clipboard-win directly
    match read_files_clipboard_win() {
        Ok(result) => Ok(result),
        Err(_) => Ok((vec![], false)),
    }
}

fn read_files_clipboard_win() -> Result<(Vec<String>, bool), String> {
    let _clip = Clipboard::new_attempts(10).map_err(|e| e.to_string())?;

    let mut files = Vec::new();
    FileList.read_clipboard(&mut files).map_err(|e| e.to_string())?;

    let mut buf = Vec::new();
    let is_cut = match RawData(drop_effect_format()).read_clipboard(&mut buf) {
        Ok(_) if buf.len() >= 4 => {
            u32::from_le_bytes([buf[0], buf[1], buf[2], buf[3]]) & DROPEFFECT_MOVE != 0
        }
        _ => false,
    };

    Ok((files, is_cut))
}

fn check_drop_effect_ps() -> bool {
    // Check if the clipboard operation was a cut (Ctrl+X) by reading the drop effect
    let script = r#"
    Add-Type -AssemblyName System.Windows.Forms
    $data = [System.Windows.Forms.Clipboard]::GetDataObject()
    if ($data -and $data.GetDataPresent('Preferred DropEffect')) {
        $stream = $data.GetData('Preferred DropEffect')
        $bytes = New-Object byte[] 4
        $stream.Read($bytes, 0, 4)
        $effect = [BitConverter]::ToInt32($bytes, 0)
        if ($effect -band 2) { Write-Output 'cut' } else { Write-Output 'copy' }
    } else {
        Write-Output 'copy'
    }
    "#;
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-STA", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok();

    output
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_lowercase() == "cut")
        .unwrap_or(false)
}

/// Check if the system clipboard contains files (CF_HDROP)
#[tauri::command]
pub fn clipboard_has_files() -> Result<bool, String> {
    let script = r#"
    $files = Get-Clipboard -Format FileDropList -ErrorAction SilentlyContinue
    if ($files -and $files.Count -gt 0) { Write-Output 'true' } else { Write-Output 'false' }
    "#;
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-STA", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;

    let result = String::from_utf8_lossy(&output.stdout).trim().to_lowercase();
    Ok(result == "true")
}
