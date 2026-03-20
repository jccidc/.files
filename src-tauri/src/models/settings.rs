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
    // Visual Effects
    #[serde(default = "default_window_effect")]
    pub window_effect: String,
    #[serde(default = "default_opacity")]
    pub sidebar_opacity: f32,
    #[serde(default = "default_opacity")]
    pub toolbar_opacity: f32,
    #[serde(default = "default_opacity")]
    pub terminal_opacity: f32,
    #[serde(default = "default_true")]
    pub enable_glow: bool,
    #[serde(default)]
    pub enable_cursor_trail: bool,
    #[serde(default = "default_true")]
    pub enable_animations: bool,
    #[serde(default = "default_animation_speed")]
    pub animation_speed: f32,
    #[serde(default = "default_border_radius")]
    pub border_radius: u8,
    #[serde(default = "default_density")]
    pub density: String,
    #[serde(default = "default_icon_theme")]
    pub icon_theme: String,
    // Radical theming
    #[serde(default = "default_accent_secondary")]
    pub accent_secondary: String,
    #[serde(default)]
    pub gradient_accent: bool,
    #[serde(default)]
    pub selection_glow: bool,
    #[serde(default)]
    pub neon_mode: bool,
    #[serde(default)]
    pub accent_tinted_text: bool,
    #[serde(default)]
    pub rainbow_folders: bool,
    #[serde(default)]
    pub adaptive_accent: bool,
    #[serde(default = "default_bg_pattern")]
    pub bg_pattern: String,
    #[serde(default)]
    pub bg_custom_url: String,
    #[serde(default = "default_bg_opacity")]
    pub bg_opacity: f32,
    #[serde(default)]
    pub custom_css: String,
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
    #[serde(default)]
    pub custom_themes: Vec<serde_json::Value>,
    #[serde(default)]
    pub custom_fonts: Vec<serde_json::Value>,
    // Widgets
    #[serde(default = "default_titlebar_widgets")]
    pub titlebar_widgets: Vec<String>,
    #[serde(default = "default_footer_widgets")]
    pub footer_widgets: Vec<String>,
    #[serde(default = "default_widget_alignment")]
    pub widget_alignment: String,
    #[serde(default = "default_clock_format")]
    pub clock_format: String,
    #[serde(default)]
    pub weather_zip: String,
    #[serde(default = "default_weather_unit")]
    pub weather_unit: String,
    #[serde(default)]
    pub hidden_sidebar_folders: Vec<String>,
    #[serde(default)]
    pub column_order: Vec<String>,
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
fn default_window_effect() -> String { "none".to_string() }
fn default_opacity() -> f32 { 1.0 }
fn default_animation_speed() -> f32 { 1.0 }
fn default_border_radius() -> u8 { 8 }
fn default_density() -> String { "comfortable".to_string() }
fn default_icon_theme() -> String { "minimal".to_string() }
fn default_accent_secondary() -> String { "#A78BFA".to_string() }
fn default_bg_pattern() -> String { "none".to_string() }
fn default_bg_opacity() -> f32 { 0.05 }
fn default_titlebar_widgets() -> Vec<String> { vec!["verse".into(), "clock".into(), "weather".into()] }
fn default_footer_widgets() -> Vec<String> { vec!["spotify".into(), "system".into(), "disk".into()] }
fn default_widget_alignment() -> String { "left".to_string() }
fn default_clock_format() -> String { "12h".to_string() }
fn default_weather_unit() -> String { "f".to_string() }

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            accent_color: default_accent(),
            font_family: default_font(),
            font_size: default_font_size(),
            ui_scale: default_ui_scale(),
            window_effect: default_window_effect(),
            sidebar_opacity: default_opacity(),
            toolbar_opacity: default_opacity(),
            terminal_opacity: default_opacity(),
            enable_glow: true,
            enable_cursor_trail: false,
            enable_animations: true,
            animation_speed: default_animation_speed(),
            border_radius: default_border_radius(),
            density: default_density(),
            icon_theme: default_icon_theme(),
            accent_secondary: default_accent_secondary(),
            gradient_accent: false,
            selection_glow: false,
            neon_mode: false,
            accent_tinted_text: false,
            rainbow_folders: false,
            adaptive_accent: false,
            bg_pattern: default_bg_pattern(),
            bg_custom_url: String::new(),
            bg_opacity: default_bg_opacity(),
            custom_css: String::new(),
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
            custom_themes: Vec::new(),
            custom_fonts: Vec::new(),
            titlebar_widgets: default_titlebar_widgets(),
            footer_widgets: default_footer_widgets(),
            widget_alignment: default_widget_alignment(),
            clock_format: default_clock_format(),
            weather_zip: String::new(),
            weather_unit: default_weather_unit(),
            hidden_sidebar_folders: Vec::new(),
            column_order: Vec::new(),
        }
    }
}
