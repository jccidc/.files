import { useState, useRef, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settings';
import { THEMES, ACCENT_PRESETS, deriveTokens, resolveTheme, validateThemeJson, applyTheme } from '../../theme/themes';
import type { ThemeTokens } from '../../types';
import { detectCloudMounts } from '../../api/cloud';
import { isDefaultFolderHandler, setDefaultFolderHandler } from '../../api/registry';
import { listSystemFonts, installCustomFont, removeCustomFont } from '../../api/fonts';
import type { CloudSource, CustomFont } from '../../types';

type Section = 'appearance' | 'explorer' | 'terminal' | 'keybindings' | 'cloud';

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: 'appearance',
    label: 'Appearance',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <circle cx="8" cy="8" r="5.5" />
        <path d="M8 2.5v11M2.5 8h11" />
      </svg>
    ),
  },
  {
    id: 'explorer',
    label: 'Explorer',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M1.5 3a1 1 0 011-1H6l1.5 1.5H13.5a1 1 0 011 1V13a1 1 0 01-1 1h-12a1 1 0 01-1-1V3z" />
      </svg>
    ),
  },
  {
    id: 'terminal',
    label: 'Terminal',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
        <polyline points="4.5,6 7,8.5 4.5,11" />
        <line x1="9" y1="11" x2="12" y2="11" />
      </svg>
    ),
  },
  {
    id: 'cloud',
    label: 'Cloud',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M4.5 12.5A3.5 3.5 0 013 5.8 4.5 4.5 0 0111.8 4a3 3 0 01.7 5.9" />
        <path d="M5 12h6a2.5 2.5 0 000-5h-.5" />
      </svg>
    ),
  },
  {
    id: 'keybindings',
    label: 'Keybindings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="1.5" y="4" width="13" height="8" rx="1.5" />
        <line x1="4" y1="7" x2="5.5" y2="7" />
        <line x1="7" y1="7" x2="9" y2="7" />
        <line x1="10.5" y1="7" x2="12" y2="7" />
        <line x1="4.5" y1="9.5" x2="11.5" y2="9.5" />
      </svg>
    ),
  },
];

const KEYBINDINGS = [
  { action: 'New Explorer Tab', keys: 'Ctrl+T' },
  { action: 'New Terminal Tab', keys: 'Ctrl+Shift+T' },
  { action: 'Close Tab', keys: 'Ctrl+W' },
  { action: 'Toggle Sidebar', keys: 'Ctrl+B' },
  { action: 'Fuzzy Search', keys: 'Ctrl+P' },
  { action: 'Address Bar', keys: 'Ctrl+L' },
  { action: 'Select All', keys: 'Ctrl+A' },
  { action: 'Rename', keys: 'F2' },
  { action: 'Delete', keys: 'Delete' },
  { action: 'Quick Preview', keys: 'Space' },
  { action: 'Refresh', keys: 'F5' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: Props) {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const reset = useSettingsStore((s) => s.reset);
  const exportSettings = useSettingsStore((s) => s.exportSettings);
  const importSettings = useSettingsStore((s) => s.importSettings);
  const [section, setSection] = useState<Section>('appearance');
  const [kbSearch, setKbSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [detectedMounts, setDetectedMounts] = useState<{ provider: string; label: string; path: string }[]>([]);
  const [newSource, setNewSource] = useState({ label: '', path: '', provider: 'custom' });
  const [isDefaultHandler, setIsDefaultHandler] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ThemeTokens | null>(null);
  const [editMode, setEditMode] = useState<'smart' | 'advanced'>('smart');
  const [baseThemeId, setBaseThemeId] = useState('dotfiles-dark');
  const [smartColors, setSmartColors] = useState({
    base: '#111419', surface: '#161A21', t1: '#D8DEE9',
    accent: '#3B82F6', border: '#1A1F28', warm: '#D4A06A',
  });
  const themeImportRef = useRef<HTMLInputElement>(null);
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [fontSearch, setFontSearch] = useState('');
  const fontPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isDefaultFolderHandler().then(setIsDefaultHandler).catch(() => {});
  }, []);

  useEffect(() => {
    if (section === 'appearance' && !fontsLoaded) {
      listSystemFonts().then((fonts) => {
        setSystemFonts(fonts);
        setFontsLoaded(true);
      }).catch(() => setFontsLoaded(true));
    }
  }, [section, fontsLoaded]);

  // Close font picker on click outside
  useEffect(() => {
    if (!fontPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (fontPickerRef.current && !fontPickerRef.current.contains(e.target as Node)) {
        setFontPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fontPickerOpen]);

  const handleDefaultHandlerToggle = async () => {
    const next = !isDefaultHandler;
    try {
      await setDefaultFolderHandler(next);
      setIsDefaultHandler(next);
    } catch (e) {
      console.error('Failed to set default handler:', e);
    }
  };

  useEffect(() => {
    if (section === 'cloud') {
      detectCloudMounts().then(setDetectedMounts).catch(() => {});
    }
  }, [section]);

  const MAX_CUSTOM_THEMES = 10;
  const customThemes: ThemeTokens[] = (settings.custom_themes || []) as ThemeTokens[];
  const canCreate = customThemes.length < MAX_CUSTOM_THEMES;

  const startNewTheme = () => {
    // Use the currently active theme as the starting point (not baseThemeId)
    const currentThemeId = settings.theme;
    const activeT = THEMES[currentThemeId] || customThemes.find(t => t.id === currentThemeId) || THEMES['dotfiles-dark'];
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setSmartColors({
      base: activeT.base, surface: activeT.surface, t1: activeT.t1,
      accent: activeT.accent, border: activeT.border, warm: activeT.warm,
    });
    setEditingTheme({ ...activeT, id, name: `${activeT.name} Copy` });
    setEditMode('smart');
  };

  const startEditTheme = (t: ThemeTokens) => {
    setEditingTheme({ ...t });
    setSmartColors({
      base: t.base, surface: t.surface, t1: t.t1,
      accent: t.accent, border: t.border, warm: t.warm,
    });
    setBaseThemeId('dotfiles-dark');
    setEditMode('smart');
  };

  const saveEditingTheme = () => {
    if (!editingTheme) return;
    const existing = customThemes.findIndex(t => t.id === editingTheme.id);
    const updated = [...customThemes];
    if (existing >= 0) {
      updated[existing] = editingTheme;
    } else {
      updated.push(editingTheme);
    }
    update({ custom_themes: updated, theme: editingTheme.id });
    setEditingTheme(null);
  };

  const cancelEdit = () => {
    setEditingTheme(null);
    // Re-apply the actual current theme to undo live preview changes
    const currentTheme = resolveTheme(settings.theme, customThemes);
    applyTheme(currentTheme, settings.accent_color || undefined);
  };

  const deleteCustomTheme = (id: string) => {
    const updated = customThemes.filter(t => t.id !== id);
    const patch: Partial<typeof settings> = { custom_themes: updated };
    if (settings.theme === id) patch.theme = 'dotfiles-dark';
    update(patch);
  };

  const handleSmartColorChange = (key: keyof typeof smartColors, value: string) => {
    const next = { ...smartColors, [key]: value };
    setSmartColors(next);
    if (!editingTheme) return;
    const baseT = THEMES[baseThemeId] || THEMES['dotfiles-dark'];
    const derived = deriveTokens(
      editingTheme.name, next.base, next.surface, next.t1,
      next.accent, next.border, next.warm, baseT,
    );
    derived.id = editingTheme.id;
    derived.name = editingTheme.name;
    setEditingTheme(derived);
    applyTheme(derived, settings.accent_color || undefined);
  };

  const handleAdvancedChange = (key: keyof ThemeTokens, value: string) => {
    if (!editingTheme) return;
    const updated = { ...editingTheme, [key]: value };
    setEditingTheme(updated);
    applyTheme(updated, settings.accent_color || undefined);
  };

  const exportTheme = async (t: ThemeTokens) => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const path = await save({
        defaultPath: `${t.name.replace(/[^a-zA-Z0-9]/g, '-')}.dotfiles-theme.json`,
        filters: [{ name: 'Theme', extensions: ['json'] }],
      });
      if (!path) return;
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      await writeTextFile(path, JSON.stringify(t, null, 2));
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  const importThemeFromFile = (file: File) => {
    if (!canCreate) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result as string);
        if (!validateThemeJson(obj)) {
          alert('Invalid theme file: missing required color fields.');
          return;
        }
        obj.id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const updated = [...customThemes, obj as ThemeTokens];
        update({ custom_themes: updated, theme: obj.id });
      } catch {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const customFonts: CustomFont[] = (settings.custom_fonts || []) as CustomFont[];

  const handleAddFont = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const path = await open({
        filters: [{ name: 'Fonts', extensions: ['ttf', 'otf', 'woff2'] }],
        multiple: false,
      });
      if (!path) return;
      const result = await installCustomFont(path as string);
      const updated = [...customFonts, result];
      update({ custom_fonts: updated, font_family: result.name });
    } catch (e) {
      console.error('Font install failed:', e);
    }
  };

  const handleRemoveFont = async (font: CustomFont) => {
    try {
      await removeCustomFont(font.file);
      const updated = customFonts.filter(f => f.file !== font.file);
      const patch: Partial<typeof settings> = { custom_fonts: updated };
      if (settings.font_family === font.name) patch.font_family = 'JetBrains Mono';
      update(patch);
    } catch (e) {
      console.error('Font remove failed:', e);
    }
  };

  if (!open) return null;

  const handleImport = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        importSettings(reader.result).catch(() => {});
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = () => {
    const json = exportSettings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dotfiles-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12, color: 'var(--t2)', marginBottom: 6, display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '6px 10px', color: 'var(--t1)', fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace", outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%234C5567'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
    paddingRight: 28,
  };

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
    background: on ? 'var(--accent)' : 'var(--raised)', position: 'relative', transition: 'background 0.15s',
  });

  const toggleDot = (on: boolean): React.CSSProperties => ({
    width: 14, height: 14, borderRadius: 7, background: '#fff', position: 'absolute',
    top: 3, left: on ? 19 : 3, transition: 'left 0.15s',
  });

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: '1px solid var(--border)',
  };

  const sectionTitle = (text: string) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 16, marginBottom: 8 }}>
      {text}
    </div>
  );

  const filteredKeybindings = KEYBINDINGS.filter(
    (kb) => kb.action.toLowerCase().includes(kbSearch.toLowerCase()) || kb.keys.toLowerCase().includes(kbSearch.toLowerCase()),
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 780, maxWidth: '92vw', height: 600, maxHeight: '90vh',
        background: 'var(--base)', border: '1px solid var(--border)',
        borderRadius: 12, display: 'flex', overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}>
        {/* Left nav */}
        <div style={{
          width: 180, minWidth: 180, background: 'var(--deepest)',
          borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
          padding: '16px 0',
        }}>
          <div style={{ padding: '0 16px 16px', fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>
            Settings
          </div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', border: 'none', cursor: 'pointer',
                background: section === item.id ? 'var(--active)' : 'transparent',
                color: section === item.id ? 'var(--accent)' : 'var(--t2)',
                fontSize: 12, fontFamily: 'inherit', textAlign: 'left',
                borderLeft: section === item.id ? '2px solid var(--accent)' : '2px solid transparent',
              }}
              onMouseEnter={(e) => { if (section !== item.id) e.currentTarget.style.background = 'var(--hover)'; }}
              onMouseLeave={(e) => { if (section !== item.id) e.currentTarget.style.background = 'transparent'; }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {/* Bottom actions */}
          <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button onClick={handleExport} style={{ ...smallBtn, color: 'var(--t2)' }}>Export</button>
            <button onClick={handleImport} style={{ ...smallBtn, color: 'var(--t2)' }}>Import</button>
            <button onClick={() => { if (confirm('Reset all settings to defaults?')) reset(); }} style={{ ...smallBtn, color: 'var(--red)' }}>Reset</button>
            <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>
        </div>

        {/* Right content */}
        <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
          {/* Close button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer',
                background: 'transparent', color: 'var(--t3)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              x
            </button>
          </div>

          {section === 'appearance' && (
            <>
              {sectionTitle('Theme')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 8 }}>
                {/* Built-in themes */}
                {Object.values(THEMES).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => update({ theme: t.id })}
                    style={{
                      padding: '10px 6px', border: settings.theme === t.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                      borderRadius: 8, cursor: 'pointer', background: t.base, textAlign: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginBottom: 5 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: t.accent }} />
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: t.surface }} />
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: t.t1 }} />
                    </div>
                    <div style={{ fontSize: 10, color: t.t1, fontWeight: 500 }}>{t.name}</div>
                  </button>
                ))}
                {/* Custom themes */}
                {customThemes.map((t) => (
                  <div
                    key={t.id}
                    style={{ position: 'relative' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.querySelectorAll<HTMLElement>('[data-theme-action]').forEach(
                        (el) => { el.style.opacity = '1'; }
                      );
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.querySelectorAll<HTMLElement>('[data-theme-action]').forEach(
                        (el) => { el.style.opacity = '0'; }
                      );
                    }}
                  >
                    <button
                      onClick={() => update({ theme: t.id })}
                      style={{
                        width: '100%', padding: '10px 6px',
                        border: settings.theme === t.id ? '2px solid var(--accent)' : '2px solid var(--border)',
                        borderRadius: 8, cursor: 'pointer', background: t.base, textAlign: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginBottom: 5 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: t.accent }} />
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: t.surface }} />
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: t.t1 }} />
                      </div>
                      <div style={{ fontSize: 10, color: t.t1, fontWeight: 500 }}>{t.name}</div>
                    </button>
                    {/* Edit / Delete overlay */}
                    <div
                      data-theme-action
                      style={{
                        position: 'absolute', top: 2, right: 2, display: 'flex', gap: 2,
                        opacity: 0, transition: 'opacity 0.15s',
                      }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditTheme(t); }}
                        title="Edit"
                        style={{
                          width: 20, height: 20, borderRadius: 4, border: 'none', cursor: 'pointer',
                          background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >&#9998;</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteCustomTheme(t.id); }}
                        title="Delete"
                        style={{
                          width: 20, height: 20, borderRadius: 4, border: 'none', cursor: 'pointer',
                          background: 'rgba(0,0,0,0.6)', color: 'var(--red)', fontSize: 10,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >&#10005;</button>
                    </div>
                    {/* Export button */}
                    <button
                      data-theme-action
                      onClick={(e) => { e.stopPropagation(); exportTheme(t); }}
                      title="Export theme"
                      style={{
                        position: 'absolute', bottom: 2, right: 2, width: 20, height: 20,
                        borderRadius: 4, border: 'none', cursor: 'pointer',
                        background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.15s',
                      }}
                    >&#8681;</button>
                  </div>
                ))}
              </div>

              {/* Create / Import buttons */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  onClick={startNewTheme}
                  disabled={!canCreate}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 11, cursor: canCreate ? 'pointer' : 'not-allowed',
                    border: '1px solid var(--border)', background: 'var(--raised)',
                    color: canCreate ? 'var(--accent)' : 'var(--t3)',
                    opacity: canCreate ? 1 : 0.5,
                  }}
                >+ Create Theme</button>
                <button
                  onClick={() => themeImportRef.current?.click()}
                  disabled={!canCreate}
                  style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 11, cursor: canCreate ? 'pointer' : 'not-allowed',
                    border: '1px solid var(--border)', background: 'var(--raised)',
                    color: canCreate ? 'var(--t2)' : 'var(--t3)',
                    opacity: canCreate ? 1 : 0.5,
                  }}
                >Import Theme</button>
                <input
                  ref={themeImportRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importThemeFromFile(f);
                    e.target.value = '';
                  }}
                />
                {!canCreate && (
                  <span style={{ fontSize: 10, color: 'var(--t3)', alignSelf: 'center' }}>
                    Max {MAX_CUSTOM_THEMES} custom themes
                  </span>
                )}
              </div>

              {/* Theme editor */}
              {editingTheme && (
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: 16, marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>Theme Editor</span>
                    <button
                      onClick={() => setEditMode(editMode === 'smart' ? 'advanced' : 'smart')}
                      style={{
                        padding: '4px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                        border: '1px solid var(--border)', background: 'var(--raised)', color: 'var(--t2)',
                      }}
                    >{editMode === 'smart' ? 'Advanced' : 'Simple'}</button>
                  </div>

                  {/* Name */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Name</label>
                    <input
                      value={editingTheme.name}
                      onChange={(e) => setEditingTheme({ ...editingTheme, name: e.target.value })}
                      style={{ ...inputStyle, maxWidth: 240 }}
                      maxLength={30}
                    />
                  </div>

                  {/* Base theme selector (smart mode) */}
                  {editMode === 'smart' && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>Base Theme (for status colors)</label>
                      <select
                        value={baseThemeId}
                        onChange={(e) => {
                          setBaseThemeId(e.target.value);
                          const baseT = THEMES[e.target.value] || THEMES['dotfiles-dark'];
                          const derived = deriveTokens(
                            editingTheme.name, smartColors.base, smartColors.surface,
                            smartColors.t1, smartColors.accent, smartColors.border, smartColors.warm, baseT,
                          );
                          derived.id = editingTheme.id;
                          derived.name = editingTheme.name;
                          setEditingTheme(derived);
                          applyTheme(derived, settings.accent_color || undefined);
                        }}
                        style={{ ...selectStyle, maxWidth: 240 }}
                      >
                        {Object.values(THEMES).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Smart mode: 6 color pickers */}
                  {editMode === 'smart' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      {([
                        ['base', 'Base'],
                        ['surface', 'Surface'],
                        ['t1', 'Text'],
                        ['accent', 'Accent'],
                        ['border', 'Border'],
                        ['warm', 'Warm'],
                      ] as const).map(([key, label]) => (
                        <div key={key}>
                          <label style={{ ...labelStyle, fontSize: 10 }}>{label}</label>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="color"
                              value={smartColors[key]}
                              onChange={(e) => handleSmartColorChange(key, e.target.value)}
                              style={{ width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', padding: 0, background: 'transparent' }}
                            />
                            <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: "'JetBrains Mono', monospace" }}>
                              {smartColors[key]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Advanced mode: all 24 tokens grouped */}
                  {editMode === 'advanced' && (
                    <div>
                      {([
                        ['Depth Layers', ['void', 'deepest', 'deep', 'base', 'surface', 'raised', 'hover', 'active']],
                        ['Text', ['t1', 't2', 't3']],
                        ['Semantic', ['accent', 'aglow', 'warm', 'border']],
                        ['Status', ['green', 'red', 'yellow', 'purple', 'cyan']],
                      ] as [string, (keyof ThemeTokens)[]][]).map(([group, keys]) => (
                        <div key={group} style={{ marginBottom: 12 }}>
                          <label style={{ ...labelStyle, fontSize: 10, fontWeight: 600 }}>{group}</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                            {keys.map(k => (
                              <div key={k}>
                                <label style={{ fontSize: 9, color: 'var(--t3)', display: 'block', marginBottom: 2 }}>{k}</label>
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                  {k === 'aglow' ? (
                                    <input
                                      value={editingTheme[k]}
                                      onChange={(e) => handleAdvancedChange(k, e.target.value)}
                                      style={{ ...inputStyle, fontSize: 9, padding: '3px 6px', maxWidth: 120 }}
                                      placeholder="rgba(...)"
                                    />
                                  ) : (
                                    <>
                                      <input
                                        type="color"
                                        value={editingTheme[k]}
                                        onChange={(e) => handleAdvancedChange(k, e.target.value)}
                                        style={{ width: 22, height: 22, border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', padding: 0, background: 'transparent' }}
                                      />
                                      <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: "'JetBrains Mono', monospace" }}>
                                        {editingTheme[k]}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Save / Cancel */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                    <button
                      onClick={cancelEdit}
                      style={{
                        padding: '6px 16px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        border: '1px solid var(--border)', background: 'var(--raised)', color: 'var(--t2)',
                      }}
                    >Cancel</button>
                    <button
                      onClick={saveEditingTheme}
                      disabled={!editingTheme.name.trim()}
                      style={{
                        padding: '6px 16px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff',
                        fontWeight: 600, opacity: editingTheme.name.trim() ? 1 : 0.5,
                      }}
                    >Save Theme</button>
                  </div>
                </div>
              )}

              {sectionTitle('Accent Color')}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {ACCENT_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => update({ accent_color: c })}
                    style={{
                      width: 28, height: 28, borderRadius: 14, border: settings.accent_color === c ? '2px solid var(--t1)' : '2px solid transparent',
                      background: c, cursor: 'pointer', padding: 0,
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={settings.accent_color}
                  onChange={(e) => update({ accent_color: e.target.value })}
                  style={{ width: 28, height: 28, border: 'none', cursor: 'pointer', background: 'transparent', padding: 0 }}
                />
              </div>

              {sectionTitle('Window Effect')}
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Native window vibrancy (Windows 11)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['none', 'mica', 'mica-alt', 'acrylic', 'tabbed'] as const).map((fx) => (
                    <button
                      key={fx}
                      onClick={() => {
                        const updates: Record<string, any> = { window_effect: fx };
                        // Auto-lower opacity when enabling an effect for the first time
                        if (fx !== 'none' && (settings.base_opacity ?? 1) > 0.85) {
                          updates.base_opacity = fx === 'acrylic' ? 0.6 : 0.75;
                        }
                        // Restore opacity when switching back to none
                        if (fx === 'none' && (settings.base_opacity ?? 1) < 0.9) {
                          updates.base_opacity = 1.0;
                        }
                        update(updates);
                      }}
                      style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        border: settings.window_effect === fx ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: settings.window_effect === fx ? 'var(--aglow)' : 'var(--raised)',
                        color: settings.window_effect === fx ? 'var(--accent)' : 'var(--t2)',
                        fontWeight: settings.window_effect === fx ? 600 : 400,
                      }}
                    >
                      {fx === 'none' ? 'None' : fx === 'mica-alt' ? 'Mica Alt' : fx.charAt(0).toUpperCase() + fx.slice(1)}
                    </button>
                  ))}
                </div>
                {settings.window_effect && settings.window_effect !== 'none' && (settings.base_opacity ?? 1) > 0.85 && (
                  <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 6 }}>
                    Tip: Lower the Base Opacity below to see the {settings.window_effect} effect through the window.
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>
                  {settings.window_effect === 'mica' ? 'Subtle tint sampled from your desktop wallpaper' :
                   settings.window_effect === 'mica-alt' ? 'Stronger wallpaper tint with more contrast' :
                   settings.window_effect === 'acrylic' ? 'Frosted glass blur effect — best with low opacity' :
                   settings.window_effect === 'tabbed' ? 'System tabbed window style with subtle tinting' :
                   'Solid background, no transparency'}
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Base Opacity: {Math.round((settings.base_opacity ?? 1) * 100)}%</label>
                <input
                  type="range" min="0" max="100" value={Math.round((settings.base_opacity ?? 1) * 100)}
                  onChange={(e) => update({ base_opacity: Number(e.target.value) / 100 })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>

              {sectionTitle('Panel Opacity')}
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Sidebar: {Math.round((settings.sidebar_opacity ?? 1) * 100)}%</label>
                <input
                  type="range" min="0" max="100" value={Math.round((settings.sidebar_opacity ?? 1) * 100)}
                  onChange={(e) => update({ sidebar_opacity: Number(e.target.value) / 100 })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Toolbar: {Math.round((settings.toolbar_opacity ?? 1) * 100)}%</label>
                <input
                  type="range" min="0" max="100" value={Math.round((settings.toolbar_opacity ?? 1) * 100)}
                  onChange={(e) => update({ toolbar_opacity: Number(e.target.value) / 100 })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Terminal: {Math.round((settings.terminal_opacity ?? 1) * 100)}%</label>
                <input
                  type="range" min="0" max="100" value={Math.round((settings.terminal_opacity ?? 1) * 100)}
                  onChange={(e) => update({ terminal_opacity: Number(e.target.value) / 100 })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>

              {sectionTitle('Effects')}
              <div style={rowStyle}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--t1)' }}>Accent Glow</span>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>Pulsing glow on active elements and focus rings</div>
                </div>
                <button style={toggleStyle(settings.enable_glow !== false)} onClick={() => update({ enable_glow: !(settings.enable_glow !== false) })}>
                  <div style={toggleDot(settings.enable_glow !== false)} />
                </button>
              </div>
              <div style={rowStyle}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--t1)' }}>Cursor Trail</span>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>Subtle accent-colored particles following mouse</div>
                </div>
                <button style={toggleStyle(!!settings.enable_cursor_trail)} onClick={() => update({ enable_cursor_trail: !settings.enable_cursor_trail })}>
                  <div style={toggleDot(!!settings.enable_cursor_trail)} />
                </button>
              </div>
              <div style={rowStyle}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--t1)' }}>Animations</span>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>Transition effects on hover, expand, context menus</div>
                </div>
                <button style={toggleStyle(settings.enable_animations !== false)} onClick={() => update({ enable_animations: !(settings.enable_animations !== false) })}>
                  <div style={toggleDot(settings.enable_animations !== false)} />
                </button>
              </div>
              {settings.enable_animations !== false && (
                <div style={{ marginBottom: 16, marginTop: 8 }}>
                  <label style={labelStyle}>Animation Speed: {settings.animation_speed ?? 1}x</label>
                  <input
                    type="range" min="0.5" max="2" step="0.1" value={settings.animation_speed ?? 1}
                    onChange={(e) => update({ animation_speed: Number(e.target.value) })}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                </div>
              )}

              {sectionTitle('Radical Theming')}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <label style={{ ...labelStyle, marginBottom: 0, flex: 1 }}>Secondary Accent</label>
                  <input
                    type="color"
                    value={settings.accent_secondary || '#A78BFA'}
                    onChange={(e) => update({ accent_secondary: e.target.value })}
                    style={{ width: 28, height: 28, border: 'none', cursor: 'pointer', background: 'transparent', padding: 0 }}
                  />
                </div>
              </div>
              <div style={rowStyle}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--t1)' }}>Gradient Accent</span>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>Blend primary to secondary accent across selections</div>
                </div>
                <button style={toggleStyle(!!settings.gradient_accent)} onClick={() => update({ gradient_accent: !settings.gradient_accent })}>
                  <div style={toggleDot(!!settings.gradient_accent)} />
                </button>
              </div>
              <div style={rowStyle}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--t1)' }}>Selection Glow</span>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>Pulsing glow ring around selected files</div>
                </div>
                <button style={toggleStyle(!!settings.selection_glow)} onClick={() => update({ selection_glow: !settings.selection_glow })}>
                  <div style={toggleDot(!!settings.selection_glow)} />
                </button>
              </div>
              <div style={rowStyle}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--t1)' }}>Neon Mode</span>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>Glowing borders and text shadows on active elements</div>
                </div>
                <button style={toggleStyle(!!settings.neon_mode)} onClick={() => update({ neon_mode: !settings.neon_mode })}>
                  <div style={toggleDot(!!settings.neon_mode)} />
                </button>
              </div>
              <div style={rowStyle}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--t1)' }}>Accent-Tinted Text</span>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>File names subtly tinted toward accent color</div>
                </div>
                <button style={toggleStyle(!!settings.accent_tinted_text)} onClick={() => update({ accent_tinted_text: !settings.accent_tinted_text })}>
                  <div style={toggleDot(!!settings.accent_tinted_text)} />
                </button>
              </div>
              <div style={rowStyle}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--t1)' }}>Rainbow Folders</span>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>Each folder gets a unique color from a palette</div>
                </div>
                <button style={toggleStyle(!!settings.rainbow_folders)} onClick={() => update({ rainbow_folders: !settings.rainbow_folders })}>
                  <div style={toggleDot(!!settings.rainbow_folders)} />
                </button>
              </div>
              <div style={rowStyle}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--t1)' }}>Adaptive Accent</span>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>File name color shifts by file extension/type</div>
                </div>
                <button style={toggleStyle(!!settings.adaptive_accent)} onClick={() => update({ adaptive_accent: !settings.adaptive_accent })}>
                  <div style={toggleDot(!!settings.adaptive_accent)} />
                </button>
              </div>

              {sectionTitle('Layout & Shape')}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Border Radius: {settings.border_radius ?? 8}px</label>
                <input
                  type="range" min="0" max="16" value={settings.border_radius ?? 8}
                  onChange={(e) => update({ border_radius: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>
                  <span>Sharp</span><span>Rounded</span>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Density</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => update({ density: d })}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        border: (settings.density || 'comfortable') === d ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: (settings.density || 'comfortable') === d ? 'var(--aglow)' : 'var(--raised)',
                        color: (settings.density || 'comfortable') === d ? 'var(--accent)' : 'var(--t2)',
                        fontWeight: (settings.density || 'comfortable') === d ? 600 : 400,
                      }}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Icon Theme</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['minimal', 'colorful', 'monochrome'] as const).map((it) => (
                    <button
                      key={it}
                      onClick={() => update({ icon_theme: it })}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        border: (settings.icon_theme || 'minimal') === it ? '1px solid var(--accent)' : '1px solid var(--border)',
                        background: (settings.icon_theme || 'minimal') === it ? 'var(--aglow)' : 'var(--raised)',
                        color: (settings.icon_theme || 'minimal') === it ? 'var(--accent)' : 'var(--t2)',
                        fontWeight: (settings.icon_theme || 'minimal') === it ? 600 : 400,
                      }}
                    >
                      {it.charAt(0).toUpperCase() + it.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {sectionTitle('Background Pattern')}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {(['none', 'dots', 'grid', 'noise', 'gradient', 'custom'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => update({ bg_pattern: p })}
                    style={{
                      padding: '6px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                      border: (settings.bg_pattern || 'none') === p ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: (settings.bg_pattern || 'none') === p ? 'var(--aglow)' : 'var(--raised)',
                      color: (settings.bg_pattern || 'none') === p ? 'var(--accent)' : 'var(--t2)',
                      fontWeight: (settings.bg_pattern || 'none') === p ? 600 : 400,
                    }}
                  >
                    {p === 'none' ? 'None' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
              {settings.bg_pattern === 'custom' && (
                <div style={{ marginBottom: 8 }}>
                  <label style={labelStyle}>Image URL</label>
                  <input
                    value={settings.bg_custom_url || ''}
                    onChange={(e) => update({ bg_custom_url: e.target.value })}
                    placeholder="https://... or local path"
                    style={inputStyle}
                  />
                </div>
              )}
              {settings.bg_pattern && settings.bg_pattern !== 'none' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Pattern Opacity: {Math.round((settings.bg_opacity ?? 0.05) * 100)}%</label>
                  <input
                    type="range" min="2" max="30" value={Math.round((settings.bg_opacity ?? 0.05) * 100)}
                    onChange={(e) => update({ bg_opacity: Number(e.target.value) / 100 })}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                </div>
              )}

              {sectionTitle('Font')}
              <div style={{ marginBottom: 16, position: 'relative' }} ref={fontPickerRef}>
                <label style={labelStyle}>UI Font Family</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* Custom font picker trigger */}
                  <button
                    onClick={() => { setFontPickerOpen(!fontPickerOpen); setFontSearch(''); }}
                    style={{
                      ...inputStyle, flex: 1, textAlign: 'left', cursor: 'pointer',
                      fontFamily: `'${settings.font_family}', sans-serif`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <span>{settings.font_family}</span>
                    <span style={{ color: 'var(--t3)', fontSize: 10 }}>{fontPickerOpen ? '\u25B2' : '\u25BC'}</span>
                  </button>
                  <button
                    onClick={handleAddFont}
                    title="Add custom font file"
                    style={{
                      padding: '6px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                      border: '1px solid var(--border)', background: 'var(--raised)',
                      color: 'var(--accent)', whiteSpace: 'nowrap',
                    }}
                  >+ Add Font</button>
                </div>

                {/* Font picker dropdown */}
                {fontPickerOpen && (
                  <div
                    style={{
                      position: 'absolute', top: '100%', left: 0, right: 48, zIndex: 50,
                      background: 'var(--raised)', border: '1px solid var(--border)',
                      borderRadius: 8, marginTop: 4, overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                  >
                    {/* Search */}
                    <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
                      <input
                        autoFocus
                        value={fontSearch}
                        onChange={(e) => setFontSearch(e.target.value)}
                        placeholder="Search fonts..."
                        style={{ ...inputStyle, fontSize: 11 }}
                        onKeyDown={(e) => { if (e.key === 'Escape') setFontPickerOpen(false); }}
                      />
                    </div>
                    {/* Font list */}
                    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                      {/* Bundled */}
                      {(() => {
                        const bundled = ['JetBrains Mono', 'Outfit'].filter(n => n.toLowerCase().includes(fontSearch.toLowerCase()));
                        const custom = customFonts.filter(f => f.name.toLowerCase().includes(fontSearch.toLowerCase()));
                        const system = systemFonts.filter(n => n.toLowerCase().includes(fontSearch.toLowerCase()));
                        return (
                          <>
                            {bundled.length > 0 && (
                              <>
                                <div style={{ padding: '6px 12px', fontSize: 9, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bundled</div>
                                {bundled.map(name => (
                                  <button
                                    key={name}
                                    onClick={() => { update({ font_family: name }); setFontPickerOpen(false); }}
                                    style={{
                                      display: 'block', width: '100%', padding: '8px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                      background: settings.font_family === name ? 'var(--active)' : 'transparent',
                                      color: settings.font_family === name ? 'var(--accent)' : 'var(--t1)',
                                    }}
                                    onMouseEnter={(e) => { if (settings.font_family !== name) e.currentTarget.style.background = 'var(--hover)'; }}
                                    onMouseLeave={(e) => { if (settings.font_family !== name) e.currentTarget.style.background = 'transparent'; }}
                                  >
                                    <div style={{ fontFamily: `'${name}', sans-serif`, fontSize: 13 }}>{name}</div>
                                    <div style={{ fontFamily: `'${name}', sans-serif`, fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>The quick brown fox jumps over the lazy dog</div>
                                  </button>
                                ))}
                              </>
                            )}
                            {custom.length > 0 && (
                              <>
                                <div style={{ padding: '6px 12px', fontSize: 9, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', borderTop: '1px solid var(--border)' }}>Custom</div>
                                {custom.map(f => (
                                  <div key={f.file} style={{ display: 'flex', alignItems: 'center' }}>
                                    <button
                                      onClick={() => { update({ font_family: f.name }); setFontPickerOpen(false); }}
                                      style={{
                                        flex: 1, padding: '8px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                        background: settings.font_family === f.name ? 'var(--active)' : 'transparent',
                                        color: settings.font_family === f.name ? 'var(--accent)' : 'var(--t1)',
                                      }}
                                      onMouseEnter={(e) => { if (settings.font_family !== f.name) e.currentTarget.style.background = 'var(--hover)'; }}
                                      onMouseLeave={(e) => { if (settings.font_family !== f.name) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                      <div style={{ fontFamily: `'${f.name}', sans-serif`, fontSize: 13 }}>{f.name}</div>
                                      <div style={{ fontFamily: `'${f.name}', sans-serif`, fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>The quick brown fox jumps over the lazy dog</div>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleRemoveFont(f); }}
                                      title="Remove font"
                                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--red)', fontSize: 11, padding: '4px 8px' }}
                                    >x</button>
                                  </div>
                                ))}
                              </>
                            )}
                            {system.length > 0 && (
                              <>
                                <div style={{ padding: '6px 12px', fontSize: 9, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', borderTop: '1px solid var(--border)' }}>System</div>
                                {system.map(name => (
                                  <button
                                    key={name}
                                    onClick={() => { update({ font_family: name }); setFontPickerOpen(false); }}
                                    style={{
                                      display: 'block', width: '100%', padding: '8px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                      background: settings.font_family === name ? 'var(--active)' : 'transparent',
                                      color: settings.font_family === name ? 'var(--accent)' : 'var(--t1)',
                                    }}
                                    onMouseEnter={(e) => { if (settings.font_family !== name) e.currentTarget.style.background = 'var(--hover)'; }}
                                    onMouseLeave={(e) => { if (settings.font_family !== name) e.currentTarget.style.background = 'transparent'; }}
                                  >
                                    <div style={{ fontFamily: `'${name}', sans-serif`, fontSize: 13 }}>{name}</div>
                                    <div style={{ fontFamily: `'${name}', sans-serif`, fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>The quick brown fox jumps over the lazy dog</div>
                                  </button>
                                ))}
                              </>
                            )}
                            {bundled.length === 0 && custom.length === 0 && system.length === 0 && (
                              <div style={{ padding: '12px', fontSize: 11, color: 'var(--t3)', textAlign: 'center' }}>No fonts match "{fontSearch}"</div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Font Size: {settings.font_size}px</label>
                <input
                  type="range" min="10" max="18" value={settings.font_size}
                  onChange={(e) => update({ font_size: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>UI Scale: {settings.ui_scale}%</label>
                <input
                  type="range" min="80" max="150" step="5" value={settings.ui_scale}
                  onChange={(e) => update({ ui_scale: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>

              {sectionTitle('Custom CSS')}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Advanced: inject raw CSS (power users)</label>
                <textarea
                  value={settings.custom_css || ''}
                  onChange={(e) => update({ custom_css: e.target.value })}
                  placeholder={`/* Example: */\n.sidebar { backdrop-filter: blur(20px); }`}
                  rows={5}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: 80,
                    lineHeight: 1.5,
                  }}
                />
              </div>
            </>
          )}

          {section === 'explorer' && (
            <>
              {sectionTitle('View')}
              <div style={rowStyle}>
                <span style={{ fontSize: 12, color: 'var(--t1)' }}>Default View Mode</span>
                <select value={settings.default_view} onChange={(e) => update({ default_view: e.target.value })} style={{ ...selectStyle, width: 120 }}>
                  <option value="list">List</option>
                  <option value="grid">Grid</option>
                </select>
              </div>

              {sectionTitle('Visibility')}
              <div style={rowStyle}>
                <span style={{ fontSize: 12, color: 'var(--t1)' }}>Show Hidden Files</span>
                <button style={toggleStyle(settings.show_hidden)} onClick={() => update({ show_hidden: !settings.show_hidden })}>
                  <div style={toggleDot(settings.show_hidden)} />
                </button>
              </div>
              <div style={rowStyle}>
                <span style={{ fontSize: 12, color: 'var(--t1)' }}>Show File Extensions</span>
                <button style={toggleStyle(settings.show_extensions)} onClick={() => update({ show_extensions: !settings.show_extensions })}>
                  <div style={toggleDot(settings.show_extensions)} />
                </button>
              </div>

              {sectionTitle('Interactions')}
              <div style={rowStyle}>
                <span style={{ fontSize: 12, color: 'var(--t1)' }}>Show Hover Tooltips</span>
                <button style={toggleStyle(settings.show_tooltips)} onClick={() => update({ show_tooltips: !settings.show_tooltips })}>
                  <div style={toggleDot(settings.show_tooltips)} />
                </button>
              </div>
              <div style={rowStyle}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--t1)' }}>Tooltip Delay</span>
                  <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 8 }}>{settings.tooltip_delay}ms</span>
                </div>
                <input
                  type="range" min="200" max="1500" step="100" value={settings.tooltip_delay}
                  onChange={(e) => update({ tooltip_delay: Number(e.target.value) })}
                  style={{ width: 140, accentColor: 'var(--accent)' }}
                />
              </div>
              <div style={rowStyle}>
                <span style={{ fontSize: 12, color: 'var(--t1)' }}>Peek Folders (inline expand)</span>
                <button style={toggleStyle(settings.peek_enabled)} onClick={() => update({ peek_enabled: !settings.peek_enabled })}>
                  <div style={toggleDot(settings.peek_enabled)} />
                </button>
              </div>

              {sectionTitle('Ignored Patterns')}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Comma-separated patterns hidden from explorer</label>
                <input
                  value={settings.ignored_patterns}
                  onChange={(e) => update({ ignored_patterns: e.target.value })}
                  style={inputStyle}
                  placeholder="node_modules,.git,__pycache__"
                />
              </div>

              {sectionTitle('Windows Integration')}
              <div style={rowStyle}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--t1)' }}>Default folder handler</span>
                  <div style={{ fontSize: 10, color: 'var(--t3)' }}>Open folders in .files instead of Explorer</div>
                </div>
                <button style={toggleStyle(isDefaultHandler)} onClick={handleDefaultHandlerToggle}>
                  <div style={toggleDot(isDefaultHandler)} />
                </button>
              </div>
              {sectionTitle('Widgets')}
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>Place widgets in the titlebar or footer. Bible verse is always in the titlebar.</div>
              {[
                { id: 'clock', label: 'Flip Clock' },
                { id: 'weather', label: 'Weather' },
                { id: 'spotify', label: 'Spotify Now Playing' },
                { id: 'system', label: 'CPU / RAM / Battery' },
                { id: 'disk', label: 'Disk Space' },
              ].map((w) => {
                const tbWidgets: string[] = (settings as any).titlebar_widgets || ['clock', 'weather'];
                const ftWidgets: string[] = (settings as any).footer_widgets || [];
                const location = tbWidgets.includes(w.id) ? 'titlebar' : ftWidgets.includes(w.id) ? 'footer' : 'off';
                return (
                  <div key={w.id} style={rowStyle}>
                    <span style={{ fontSize: 12, color: 'var(--t1)' }}>{w.label}</span>
                    <select
                      value={location}
                      onChange={(e) => {
                        const val = e.target.value;
                        let tb = tbWidgets.filter((id: string) => id !== w.id);
                        let ft = ftWidgets.filter((id: string) => id !== w.id);
                        if (val === 'titlebar') tb.push(w.id);
                        if (val === 'footer') ft.push(w.id);
                        update({ titlebar_widgets: tb, footer_widgets: ft } as any);
                      }}
                      style={{ ...selectStyle, width: 100 }}
                    >
                      <option value="off">Off</option>
                      <option value="titlebar">Titlebar</option>
                      <option value="footer">Footer</option>
                    </select>
                  </div>
                );
              })}

              <div style={rowStyle}>
                <span style={{ fontSize: 12, color: 'var(--t1)' }}>Clock Format</span>
                <select value={(settings as any).clock_format || '12h'} onChange={(e) => update({ clock_format: e.target.value } as any)} style={{ ...selectStyle, width: 80 }}>
                  <option value="12h">12-hour</option>
                  <option value="24h">24-hour</option>
                </select>
              </div>

              {sectionTitle('Weather')}
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>Show live weather in the titlebar</div>
              <div style={rowStyle}>
                <span style={{ fontSize: 12, color: 'var(--t1)' }}>ZIP Code</span>
                <input
                  type="text"
                  placeholder="e.g. 46321"
                  value={(settings as any).weather_zip || ''}
                  onChange={(e) => update({ weather_zip: e.target.value } as any)}
                  style={{
                    width: 80, padding: '4px 8px', fontSize: 12,
                    background: 'var(--deep)', border: '1px solid var(--border)',
                    borderRadius: 4, color: 'var(--t1)', fontFamily: 'inherit',
                    outline: 'none',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                />
              </div>
              <div style={rowStyle}>
                <span style={{ fontSize: 12, color: 'var(--t1)' }}>Temperature Unit</span>
                <select value={(settings as any).weather_unit || 'f'} onChange={(e) => update({ weather_unit: e.target.value } as any)} style={{ ...selectStyle, width: 100 }}>
                  <option value="f">Fahrenheit</option>
                  <option value="c">Celsius</option>
                </select>
              </div>

              {sectionTitle('Sidebar Folders')}
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>Choose which folders appear in the sidebar</div>
              {['Desktop', 'Documents', 'Downloads', 'Pictures', 'Music', 'Videos', 'Recycle Bin'].map((folder) => {
                const hidden: string[] = (settings as any).hidden_sidebar_folders || [];
                const isVisible = !hidden.includes(folder);
                return (
                  <div key={folder} style={rowStyle}>
                    <span style={{ fontSize: 12, color: 'var(--t1)' }}>{folder}</span>
                    <button style={toggleStyle(isVisible)} onClick={() => {
                      const current: string[] = (settings as any).hidden_sidebar_folders || [];
                      if (isVisible) {
                        update({ hidden_sidebar_folders: [...current, folder] } as any);
                      } else {
                        update({ hidden_sidebar_folders: current.filter((f: string) => f !== folder) } as any);
                      }
                    }}>
                      <div style={toggleDot(isVisible)} />
                    </button>
                  </div>
                );
              })}
            </>
          )}

          {section === 'terminal' && (
            <>
              {sectionTitle('Shell')}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Default Shell</label>
                <select value={settings.terminal_shell} onChange={(e) => update({ terminal_shell: e.target.value })} style={selectStyle}>
                  <option value="powershell">PowerShell</option>
                  <option value="cmd">Command Prompt</option>
                  <option value="bash">Git Bash</option>
                  <option value="wsl">WSL</option>
                </select>
              </div>

              {sectionTitle('Display')}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Font Size: {settings.terminal_font_size}px</label>
                <input
                  type="range" min="10" max="22" value={settings.terminal_font_size}
                  onChange={(e) => update({ terminal_font_size: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>

              <div style={rowStyle}>
                <span style={{ fontSize: 12, color: 'var(--t1)' }}>Cursor Style</span>
                <select value={settings.terminal_cursor_style} onChange={(e) => update({ terminal_cursor_style: e.target.value })} style={{ ...selectStyle, width: 120 }}>
                  <option value="block">Block</option>
                  <option value="underline">Underline</option>
                  <option value="bar">Bar</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Scrollback Lines: {settings.terminal_scrollback.toLocaleString()}</label>
                <input
                  type="range" min="1000" max="50000" step="1000" value={settings.terminal_scrollback}
                  onChange={(e) => update({ terminal_scrollback: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>
            </>
          )}

          {section === 'cloud' && (
            <>
              {sectionTitle('Detected Cloud Providers')}
              {detectedMounts.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--t3)', padding: '8px 0' }}>No cloud providers detected.</div>
              )}
              {detectedMounts.map((m) => (
                <div key={m.path} style={rowStyle}>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 500 }}>{m.label}</span>
                    <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: "'JetBrains Mono', monospace" }}>{m.path}</div>
                  </div>
                  <span style={{
                    fontSize: 10, color: 'var(--green)', background: 'rgba(74,222,128,0.1)',
                    padding: '2px 8px', borderRadius: 4, fontWeight: 500,
                  }}>
                    Auto
                  </span>
                </div>
              ))}

              {sectionTitle('Custom Cloud Sources')}
              {(settings.cloud_sources || []).map((cs: CloudSource, idx: number) => (
                <div key={idx} style={rowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--t1)', fontWeight: 500 }}>{cs.label}</span>
                    <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cs.path}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button style={toggleStyle(cs.enabled)} onClick={() => {
                      const sources = [...(settings.cloud_sources || [])];
                      sources[idx] = { ...sources[idx], enabled: !sources[idx].enabled };
                      update({ cloud_sources: sources });
                    }}>
                      <div style={toggleDot(cs.enabled)} />
                    </button>
                    <button
                      onClick={() => {
                        const sources = (settings.cloud_sources || []).filter((_: CloudSource, i: number) => i !== idx);
                        update({ cloud_sources: sources });
                      }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 4, fontSize: 14 }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; }}
                    >
                      x
                    </button>
                  </div>
                </div>
              ))}

              {sectionTitle('Add Cloud Source')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Label</label>
                  <input
                    value={newSource.label}
                    onChange={(e) => setNewSource({ ...newSource, label: e.target.value })}
                    placeholder="e.g. My NAS"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Path</label>
                  <input
                    value={newSource.path}
                    onChange={(e) => setNewSource({ ...newSource, path: e.target.value })}
                    placeholder="e.g. Z:\Shared or \\server\share"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Provider</label>
                  <select value={newSource.provider} onChange={(e) => setNewSource({ ...newSource, provider: e.target.value })} style={selectStyle}>
                    <option value="custom">Custom</option>
                    <option value="onedrive">OneDrive</option>
                    <option value="gdrive">Google Drive</option>
                    <option value="dropbox">Dropbox</option>
                    <option value="network">Network Share</option>
                  </select>
                </div>
                <button
                  disabled={!newSource.label.trim() || !newSource.path.trim()}
                  onClick={() => {
                    const source: CloudSource = {
                      label: newSource.label.trim(),
                      path: newSource.path.trim(),
                      provider: newSource.provider,
                      enabled: true,
                    };
                    update({ cloud_sources: [...(settings.cloud_sources || []), source] });
                    setNewSource({ label: '', path: '', provider: 'custom' });
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    background: newSource.label.trim() && newSource.path.trim() ? 'var(--accent)' : 'var(--raised)',
                    color: newSource.label.trim() && newSource.path.trim() ? '#fff' : 'var(--t3)',
                    border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 12,
                    cursor: newSource.label.trim() && newSource.path.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: 500,
                  }}
                >
                  Add Source
                </button>
              </div>

              {sectionTitle('GitHub')}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Personal Access Token</label>
                <input
                  type="password"
                  value={settings.github_pat}
                  onChange={(e) => update({ github_pat: e.target.value })}
                  placeholder="ghp_..."
                  style={inputStyle}
                />
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>
                  Used to browse and clone your GitHub repos from the sidebar.
                </div>
              </div>
            </>
          )}

          {section === 'keybindings' && (
            <>
              {sectionTitle('Keyboard Shortcuts')}
              <input
                value={kbSearch}
                onChange={(e) => setKbSearch(e.target.value)}
                placeholder="Search keybindings..."
                style={{ ...inputStyle, marginBottom: 12 }}
              />
              <div style={{ borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 150px',
                  background: 'var(--deep)', padding: '6px 12px',
                  fontSize: 11, color: 'var(--t3)', fontWeight: 500,
                }}>
                  <span>Action</span>
                  <span>Shortcut</span>
                </div>
                {filteredKeybindings.map((kb, i) => (
                  <div key={kb.action} style={{
                    display: 'grid', gridTemplateColumns: '1fr 150px',
                    padding: '8px 12px', fontSize: 12,
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    borderTop: '1px solid var(--border)',
                  }}>
                    <span style={{ color: 'var(--t1)' }}>{kb.action}</span>
                    <span style={{
                      color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                    }}>
                      {kb.keys}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--t3)' }}>
                Custom keybinding editor coming in v2.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const smallBtn: React.CSSProperties = {
  padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 4,
  background: 'transparent', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
};
