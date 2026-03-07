use std::path::Path;

/// Check if a file is hidden. On Windows, checks the FILE_ATTRIBUTE_HIDDEN flag.
/// On non-Windows, falls back to dotfile convention.
pub fn is_hidden(path: &Path) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
        if let Ok(metadata) = path.metadata() {
            return metadata.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0;
        }
    }

    #[cfg(not(windows))]
    {
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            return name.starts_with('.');
        }
    }

    false
}

/// Return the user's home directory as a String.
pub fn get_home_dir() -> Option<String> {
    dirs::home_dir().map(|p| p.to_string_lossy().to_string())
}

/// Return available Windows drive letters (e.g. "C:\\", "D:\\").
pub fn get_drives() -> Vec<String> {
    let mut drives = Vec::new();
    for letter in b'A'..=b'Z' {
        let drive = format!("{}:\\", letter as char);
        if Path::new(&drive).exists() {
            drives.push(drive);
        }
    }
    drives
}
