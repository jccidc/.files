export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_hidden: boolean;
  is_symlink: boolean;
  size: number;
  modified: string;
  created: string;
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

export interface AppSettings {
  // Appearance
  theme: string;
  accent_color: string;
  font_family: string;
  font_size: number;
  ui_scale: number;
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
