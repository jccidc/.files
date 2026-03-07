import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '../types';
import { loadSettings, saveSettings } from '../api/settings';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dotfiles-dark',
  accent_color: '#3B82F6',
  font_family: 'JetBrains Mono',
  font_size: 13,
  ui_scale: 100,
  window_effect: 'none',
  sidebar_opacity: 1.0,
  toolbar_opacity: 1.0,
  terminal_opacity: 1.0,
  enable_glow: true,
  enable_cursor_trail: false,
  enable_animations: true,
  animation_speed: 1.0,
  border_radius: 8,
  density: 'comfortable',
  icon_theme: 'minimal',
  bg_pattern: 'none',
  bg_custom_url: '',
  bg_opacity: 0.05,
  custom_css: '',
  show_hidden: false,
  show_extensions: true,
  sort_by: 'name',
  sort_asc: true,
  default_view: 'list',
  show_tooltips: true,
  tooltip_delay: 600,
  peek_enabled: true,
  ignored_patterns: 'node_modules,.git,__pycache__,.DS_Store,Thumbs.db',
  column_widths: [0, 100, 140],
  sidebar_width: 220,
  terminal_shell: 'powershell',
  terminal_font_size: 13,
  terminal_cursor_style: 'block',
  terminal_scrollback: 5000,
  pinned_paths: [],
  github_pat: '',
  sidebar_section_order: ['sources', 'cloud', 'quick-access', 'git'],
  cloud_sources: [],
};

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  reset: () => Promise<void>;
  exportSettings: () => string;
  importSettings: (json: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: { ...DEFAULT_SETTINGS },
      loaded: false,

      load: async () => {
        try {
          const raw = await loadSettings();
          // Merge with defaults so new fields get populated
          const settings = { ...DEFAULT_SETTINGS, ...raw };
          set({ settings, loaded: true });
        } catch {
          set({ loaded: true });
        }
      },

      update: async (patch) => {
        const merged = { ...get().settings, ...patch };
        set({ settings: merged });
        try {
          await saveSettings(merged);
        } catch {
          // Silently fail if backend unavailable
        }
      },

      reset: async () => {
        set({ settings: { ...DEFAULT_SETTINGS } });
        try {
          await saveSettings({ ...DEFAULT_SETTINGS });
        } catch {}
      },

      exportSettings: () => {
        return JSON.stringify(get().settings, null, 2);
      },

      importSettings: async (json: string) => {
        const parsed = JSON.parse(json);
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        set({ settings: merged });
        try {
          await saveSettings(merged);
        } catch {}
      },
    }),
    {
      name: 'dotfiles-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
