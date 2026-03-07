use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudSource {
    pub provider: String,
    pub label: String,
    pub path: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_accent")]
    pub accent_color: String,
    #[serde(default = "default_font")]
    pub font_family: String,
    #[serde(default = "default_font_size")]
    pub font_size: u8,
    #[serde(default = "default_ui_scale")]
    pub ui_scale: u8,
    #[serde(default)]
    pub show_hidden: bool,
    #[serde(default = "default_true")]
    pub show_extensions: bool,
    #[serde(default = "default_sort_by")]
    pub sort_by: String,
    #[serde(default = "default_true")]
    pub sort_asc: bool,
    #[serde(default = "default_view")]
    pub default_view: String,
    #[serde(default = "default_true")]
    pub show_tooltips: bool,
    #[serde(default = "default_tooltip_delay")]
    pub tooltip_delay: u16,
    #[serde(default = "default_true")]
    pub peek_enabled: bool,
    #[serde(default = "default_ignored")]
    pub ignored_patterns: String,
    #[serde(default = "default_column_widths")]
    pub column_widths: Vec<u16>,
    #[serde(default = "default_sidebar_width")]
    pub sidebar_width: u16,
    #[serde(default = "default_shell")]
    pub terminal_shell: String,
    #[serde(default = "default_font_size")]
    pub terminal_font_size: u8,
    #[serde(default = "default_cursor")]
    pub terminal_cursor_style: String,
    #[serde(default = "default_scrollback")]
    pub terminal_scrollback: u32,
    #[serde(default)]
    pub pinned_paths: Vec<String>,
    #[serde(default)]
    pub github_pat: String,
    #[serde(default = "default_sidebar_section_order")]
    pub sidebar_section_order: Vec<String>,
    #[serde(default)]
    pub cloud_sources: Vec<CloudSource>,
}

fn default_theme() -> String { "dotfiles-dark".to_string() }
fn default_accent() -> String { "#3B82F6".to_string() }
fn default_font() -> String { "JetBrains Mono".to_string() }
fn default_font_size() -> u8 { 13 }
fn default_ui_scale() -> u8 { 100 }
fn default_true() -> bool { true }
fn default_sort_by() -> String { "name".to_string() }
fn default_view() -> String { "list".to_string() }
fn default_tooltip_delay() -> u16 { 600 }
fn default_ignored() -> String { "node_modules,.git,__pycache__,.DS_Store,Thumbs.db".to_string() }
fn default_column_widths() -> Vec<u16> { vec![0, 100, 140] }
fn default_sidebar_width() -> u16 { 220 }
fn default_shell() -> String { "powershell.exe".to_string() }
fn default_cursor() -> String { "block".to_string() }
fn default_scrollback() -> u32 { 5000 }
fn default_sidebar_section_order() -> Vec<String> { vec!["sources".into(), "cloud".into(), "quick-access".into(), "git".into()] }

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            accent_color: default_accent(),
            font_family: default_font(),
            font_size: default_font_size(),
            ui_scale: default_ui_scale(),
            show_hidden: false,
            show_extensions: true,
            sort_by: default_sort_by(),
            sort_asc: true,
            default_view: default_view(),
            show_tooltips: true,
            tooltip_delay: default_tooltip_delay(),
            peek_enabled: true,
            ignored_patterns: default_ignored(),
            column_widths: default_column_widths(),
            sidebar_width: default_sidebar_width(),
            terminal_shell: default_shell(),
            terminal_font_size: default_font_size(),
            terminal_cursor_style: default_cursor(),
            terminal_scrollback: default_scrollback(),
            pinned_paths: Vec::new(),
            github_pat: String::new(),
            sidebar_section_order: default_sidebar_section_order(),
            cloud_sources: Vec::new(),
        }
    }
}
