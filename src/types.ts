export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_hidden: boolean;
  is_symlink: boolean;
  size: number;
  modified: string;
  created: string;
  accessed: string;
  extension: string | null;
  readonly: boolean;
  children_count: number | null;
}

export interface DirListing {
  path: string;
  entries: FileEntry[];
  total_count: number;
}

export interface DirStats {
  file_count: number;
  dir_count: number;
  total_size: number;
  truncated: boolean;
}

export interface DriveInfo {
  letter: string;
  drive_type: 'fixed' | 'removable' | 'network' | 'cdrom' | 'ramdisk' | 'unknown';
  label: string;
  is_cloud: boolean;
  total_bytes: number;
  free_bytes: number;
}

export interface CloudSource {
  provider: string;
  label: string;
  path: string;
  enabled: boolean;
}

export interface ThemeTokens {
  id: string;
  name: string;
  void: string;
  deepest: string;
  deep: string;
  base: string;
  surface: string;
  raised: string;
  hover: string;
  active: string;
  border: string;
  t1: string;
  t2: string;
  t3: string;
  accent: string;
  aglow: string;
  warm: string;
  green: string;
  red: string;
  yellow: string;
  purple: string;
  cyan: string;
}

export interface CustomFont {
  name: string;  // font family name
  file: string;  // filename in app fonts dir
}

export const TAG_TYPES = {
  important: { icon: '\u2757', label: 'Important', color: '#F87171' },
  archive:   { icon: '\uD83D\uDCE6', label: 'Archive', color: '#FBBF24' },
  favorite:  { icon: '\u2B50', label: 'Favorite', color: '#FBBF24' },
  private:   { icon: '\uD83D\uDD12', label: 'Private', color: '#8891A0' },
  done:      { icon: '\u2705', label: 'Done', color: '#4ADE80' },
  progress:  { icon: '\uD83D\uDD04', label: 'In Progress', color: '#22D3EE' },
  pinned:    { icon: '\uD83D\uDCCC', label: 'Pinned', color: '#C084FC' },
} as const;

export type TagId = keyof typeof TAG_TYPES;

export interface AppSettings {
  // Appearance
  theme: string;
  accent_color: string;
  font_family: string;
  font_size: number;
  ui_scale: number;
  // Visual Effects
  window_effect: string;       // 'none' | 'mica' | 'mica-alt' | 'acrylic' | 'tabbed'
  base_opacity: number;        // 0-1.0 (void background layer)
  blur_amount: number;         // 0-60 px (backdrop blur when effect is acrylic)
  sidebar_opacity: number;     // 0-1.0
  toolbar_opacity: number;     // 0-1.0
  terminal_opacity: number;    // 0-1.0
  enable_glow: boolean;
  enable_cursor_trail: boolean;
  enable_animations: boolean;
  animation_speed: number;     // 0.5-2.0
  border_radius: number;       // 0-12
  density: string;             // 'compact' | 'comfortable' | 'spacious'
  icon_theme: string;          // 'minimal' | 'colorful' | 'monochrome'
  // Radical theming
  accent_secondary: string;    // second accent color for gradient mode
  gradient_accent: boolean;    // blend accent -> accent_secondary across UI
  selection_glow: boolean;     // pulsing glow ring on selected files
  neon_mode: boolean;          // high-contrast glowing borders + text shadows
  accent_tinted_text: boolean; // file names subtly tinted toward accent
  rainbow_folders: boolean;    // each folder gets a unique palette color
  adaptive_accent: boolean;    // file name color shifts by extension/type
  bg_pattern: string;          // 'none' | 'dots' | 'grid' | 'noise' | 'gradient' | 'custom'
  bg_custom_url: string;
  bg_opacity: number;          // 0.02-0.2
  custom_css: string;
  // Explorer
  show_hidden: boolean;
  show_extensions: boolean;
  sort_by: string;
  sort_asc: boolean;
  default_view: string;
  show_tooltips: boolean;
  tooltip_delay: number;
  peek_enabled: boolean;
  ignored_patterns: string;
  column_widths: number[];
  // Layout
  sidebar_width: number;
  // Terminal
  terminal_shell: string;
  terminal_font_size: number;
  terminal_cursor_style: string;
  terminal_scrollback: number;
  pinned_paths: string[];
  github_pat: string;
  github_repo_paths: Record<string, string>;  // full_name -> local path
  sidebar_section_order: string[];
  cloud_sources: CloudSource[];
  custom_themes: ThemeTokens[];
  custom_fonts: CustomFont[];
  // Widgets
  titlebar_widgets: string[];
  footer_widgets: string[];
  widget_alignment: string;
  clock_format: string;
  weather_zip: string;
  weather_unit: string;
  hidden_sidebar_folders: string[];
  column_order: string[];
  file_tags: Record<string, string>;  // normalized path -> TagId
}

export type TabType = 'explorer' | 'terminal' | 'preview';

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  path?: string;
  previewPath?: string;
  pinned: boolean;
}

// ---- Split Layout Types ----

export type SplitDirection = 'horizontal' | 'vertical';

export interface SplitNode {
  type: 'split';
  id: string;
  direction: SplitDirection;
  ratio: number; // 0-1, first child's fraction
  first: LayoutNode;
  second: LayoutNode;
}

export interface LeafNode {
  type: 'leaf';
  id: string;
  panelId: string;
}

export type LayoutNode = SplitNode | LeafNode;

export interface PanelState {
  tabs: Tab[];
  activeTabId: string | null;
}

export interface LayoutPreset {
  name: string;
  tree: LayoutNode;
  panels: Record<string, PanelState>;
}
