use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_hidden: bool,
    pub is_symlink: bool,
    pub size: u64,
    pub modified: String,
    pub created: String,
    pub accessed: String,
    pub extension: Option<String>,
    pub readonly: bool,
    pub children_count: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DirListing {
    pub path: String,
    pub entries: Vec<FileEntry>,
    pub total_count: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct DirStats {
    pub file_count: u64,
    pub dir_count: u64,
    pub total_size: u64,
    pub truncated: bool,
}
