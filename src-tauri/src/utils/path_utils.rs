use serde::Serialize;
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

#[derive(Debug, Clone, Serialize)]
pub struct DriveInfo {
    pub letter: String,
    pub drive_type: String, // "fixed", "removable", "network", "cdrom", "ramdisk", "unknown"
    pub label: String,
    pub is_cloud: bool,
    pub total_bytes: u64,
    pub free_bytes: u64,
}

#[cfg(windows)]
extern "system" {
    fn GetDriveTypeW(lpRootPathName: *const u16) -> u32;
    fn GetVolumeInformationW(
        lpRootPathName: *const u16,
        lpVolumeNameBuffer: *mut u16,
        nVolumeNameSize: u32,
        lpVolumeSerialNumber: *mut u32,
        lpMaximumComponentLength: *mut u32,
        lpFileSystemFlags: *mut u32,
        lpFileSystemNameBuffer: *mut u16,
        nFileSystemNameSize: u32,
    ) -> i32;
    fn GetDiskFreeSpaceExW(
        lpDirectoryName: *const u16,
        lpFreeBytesAvailableToCaller: *mut u64,
        lpTotalNumberOfBytes: *mut u64,
        lpTotalNumberOfFreeBytes: *mut u64,
    ) -> i32;
}

#[cfg(windows)]
fn to_wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

#[cfg(windows)]
fn get_volume_label(root: &str) -> String {
    let wide_root = to_wide(root);
    let mut name_buf = [0u16; 261];
    let ok = unsafe {
        GetVolumeInformationW(
            wide_root.as_ptr(),
            name_buf.as_mut_ptr(),
            name_buf.len() as u32,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            0,
        )
    };
    if ok != 0 {
        let len = name_buf.iter().position(|&c| c == 0).unwrap_or(name_buf.len());
        String::from_utf16_lossy(&name_buf[..len])
    } else {
        String::new()
    }
}

#[cfg(windows)]
fn get_disk_space(root: &str) -> (u64, u64) {
    let wide = to_wide(root);
    let mut free_caller: u64 = 0;
    let mut total: u64 = 0;
    let mut free_total: u64 = 0;
    let ok = unsafe {
        GetDiskFreeSpaceExW(
            wide.as_ptr(),
            &mut free_caller,
            &mut total,
            &mut free_total,
        )
    };
    if ok != 0 { (total, free_total) } else { (0, 0) }
}

#[cfg(not(windows))]
fn get_disk_space(_root: &str) -> (u64, u64) { (0, 0) }

/// Return available Windows drives with type classification.
/// `cloud_mount_paths` is an optional list of known cloud mount paths;
/// drives whose root matches one of these will be flagged as `is_cloud`.
pub fn get_drives_with_cloud_filter(cloud_paths: &[String]) -> Vec<DriveInfo> {
    let mut drives = Vec::new();
    for letter in b'A'..=b'Z' {
        let root = format!("{}:\\", letter as char);
        if !Path::new(&root).exists() {
            continue;
        }

        #[cfg(windows)]
        let (drive_type, label) = {
            let wide = to_wide(&root);
            let dt = unsafe { GetDriveTypeW(wide.as_ptr()) };
            let type_str = match dt {
                2 => "removable",
                3 => "fixed",
                4 => "network",
                5 => "cdrom",
                6 => "ramdisk",
                _ => "unknown",
            };
            let vol_label = get_volume_label(&root);
            (type_str.to_string(), vol_label)
        };

        #[cfg(not(windows))]
        let (drive_type, label) = ("fixed".to_string(), String::new());

        // Check if this drive root IS a cloud filesystem (e.g. G:\ for GDFS).
        // Only flag if the cloud mount is at the drive root level (depth 0-1),
        // NOT if a cloud folder just lives deep inside the drive (e.g. C:\Users\...\OneDrive).
        let is_cloud = cloud_paths.iter().any(|cp| {
            let cp_norm = cp.to_uppercase().replace('/', "\\");
            let root_upper = root.to_uppercase();
            if !cp_norm.starts_with(&root_upper) {
                return false;
            }
            // Count path components after the drive root — only shallow mounts count
            let remainder = &cp_norm[root_upper.len()..];
            let depth = remainder.trim_end_matches('\\').split('\\').filter(|s| !s.is_empty()).count();
            depth <= 1
        });

        let display_label = if label.is_empty() {
            match drive_type.as_str() {
                "removable" => format!("Removable ({})", &root[..2]),
                "network" => format!("Network ({})", &root[..2]),
                "cdrom" => format!("CD-ROM ({})", &root[..2]),
                _ => format!("Local Disk ({})", &root[..2]),
            }
        } else {
            format!("{} ({})", label, &root[..2])
        };

        // Get capacity using Win32 API (instant, no PowerShell)
        let (total_bytes, free_bytes) = get_disk_space(&root);

        drives.push(DriveInfo {
            letter: root,
            drive_type,
            label: display_label,
            is_cloud,
            total_bytes,
            free_bytes,
        });
    }
    drives
}

/// Simple version without cloud filtering (backwards compat).
pub fn get_drives() -> Vec<DriveInfo> {
    get_drives_with_cloud_filter(&[])
}
