# Custom Theme Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users create, edit, save, import, and export custom themes with up to 10 slots, featuring both a smart 6-color mode and full 24-token advanced mode.

**Architecture:** Custom themes stored as `custom_themes: ThemeTokens[]` in AppSettings (both Rust and TS). A `resolveTheme()` helper checks built-in themes first, then custom themes, with `dotfiles-dark` fallback. Theme editor is inline in SettingsPanel below the existing theme grid. `deriveTokens()` generates 18 tokens from 6 key colors for smart mode.

**Tech Stack:** React 19, TypeScript, Zustand, Tauri v2 dialog plugin (for file save/open), serde (Rust)

---

### Task 1: Add custom_themes to data model

**Files:**
- Modify: `src/types.ts:42-90`
- Modify: `src-tauri/src/models/settings.rs:11-92`
- Modify: `src/stores/settings.ts:6-49`

**Step 1: Add custom_themes to TypeScript AppSettings**

In `src/types.ts`, add after `cloud_sources` (line 89):

```typescript
  custom_themes: ThemeTokens[];
```

And add the import at top of file:

```typescript
import type { ThemeTokens } from './theme/themes';
```

Wait -- `ThemeTokens` is in themes.ts and `AppSettings` is in types.ts. To avoid circular deps, move the `ThemeTokens` interface definition into types.ts and re-export from themes.ts. Actually, simpler: just define `CustomTheme` inline in types.ts with the same shape as `ThemeTokens` -- but that's duplication. Best approach: keep `ThemeTokens` in themes.ts, and in types.ts just type `custom_themes` as an array of objects. The Zustand store + settings merge handles the rest. Since this is JSON-serialized through Rust anyway, we can type it loosely in AppSettings and cast when resolving:

```typescript
  custom_themes: Record<string, string>[]; // ThemeTokens objects
```

Actually cleanest: export `ThemeTokens` from types.ts (move it there) since it's a pure data type. Then themes.ts imports it.

In `src/types.ts`, add before `AppSettings` (line 42):

```typescript
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
```

In `AppSettings`, add:
```typescript
  custom_themes: ThemeTokens[];
```

In `src/theme/themes.ts`, remove the `ThemeTokens` interface and replace with:
```typescript
import type { ThemeTokens } from '../types';
export type { ThemeTokens };
```

**Step 2: Add custom_themes to Rust settings**

In `src-tauri/src/models/settings.rs`, add after `cloud_sources` field (line 91):

```rust
    #[serde(default)]
    pub custom_themes: Vec<serde_json::Value>,
```

And in the `Default` impl, add:
```rust
            custom_themes: Vec::new(),
```

Note: Using `serde_json::Value` avoids needing a Rust struct for ThemeTokens -- frontend owns the schema.

**Step 3: Add to DEFAULT_SETTINGS in store**

In `src/stores/settings.ts`, add to `DEFAULT_SETTINGS` (after `cloud_sources`):

```typescript
  custom_themes: [],
```

**Step 4: Commit**

```bash
git add src/types.ts src-tauri/src/models/settings.rs src/stores/settings.ts src/theme/themes.ts
git commit -m "feat: add custom_themes field to data model"
```

---

### Task 2: Add theme resolution and derivation helpers

**Files:**
- Modify: `src/theme/themes.ts`

**Step 1: Add color utility functions**

Add at the bottom of `src/theme/themes.ts`:

```typescript
/** Parse hex to RGB tuple */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** RGB tuple to hex */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

/** Darken a hex color by percent (0-100) */
function darken(hex: string, pct: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = 1 - pct / 100;
  return rgbToHex(r * f, g * f, b * f);
}

/** Lighten a hex color by percent (0-100) */
function lighten(hex: string, pct: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = pct / 100;
  return rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
}

/** Mix two hex colors (0 = all colorA, 1 = all colorB) */
function mixColors(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  );
}
```

**Step 2: Add deriveTokens()**

```typescript
/** Derive full 24-token theme from 6 key colors + a base theme for status colors */
export function deriveTokens(
  name: string,
  base: string,
  surface: string,
  t1: string,
  accent: string,
  border: string,
  warm: string,
  baseTheme: ThemeTokens,
): ThemeTokens {
  const [ar, ag, ab] = hexToRgb(accent);
  return {
    id: '', // caller sets this
    name,
    void: darken(base, 20),
    deepest: darken(base, 15),
    deep: darken(base, 8),
    base,
    surface,
    raised: lighten(surface, 5),
    hover: lighten(base, 10),
    active: lighten(base, 18),
    border,
    t1,
    t2: mixColors(t1, base, 0.5),
    t3: mixColors(t1, base, 0.75),
    accent,
    aglow: `rgba(${ar},${ag},${ab},0.12)`,
    warm,
    green: baseTheme.green,
    red: baseTheme.red,
    yellow: baseTheme.yellow,
    purple: baseTheme.purple,
    cyan: baseTheme.cyan,
  };
}
```

**Step 3: Add resolveTheme()**

```typescript
/** Look up theme by id: built-in first, then custom, fallback to dotfiles-dark */
export function resolveTheme(id: string, customThemes: ThemeTokens[]): ThemeTokens {
  return THEMES[id] || customThemes.find(t => t.id === id) || THEMES['dotfiles-dark'];
}
```

**Step 4: Add validateThemeJson()**

```typescript
const THEME_KEYS: (keyof ThemeTokens)[] = [
  'id', 'name', 'void', 'deepest', 'deep', 'base', 'surface', 'raised',
  'hover', 'active', 'border', 't1', 't2', 't3', 'accent', 'aglow',
  'warm', 'green', 'red', 'yellow', 'purple', 'cyan',
];

/** Validate that an object has all ThemeTokens fields as strings */
export function validateThemeJson(obj: unknown): obj is ThemeTokens {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return THEME_KEYS.every(k => typeof o[k] === 'string');
}
```

**Step 5: Commit**

```bash
git add src/theme/themes.ts
git commit -m "feat: add theme derivation, resolution, and validation helpers"
```

---

### Task 3: Wire resolveTheme into useTheme hook

**Files:**
- Modify: `src/hooks/useTheme.ts:1-34`

**Step 1: Update imports and add custom_themes selector**

Change line 4:
```typescript
import { THEMES, applyTheme, resolveTheme } from '../theme/themes';
```

Add after line 8 (accentColor selector):
```typescript
  const customThemes = useSettingsStore((s) => s.settings.custom_themes);
```

**Step 2: Update theme effect to use resolveTheme**

Change the theme+accent effect (lines 31-34):
```typescript
  useEffect(() => {
    const tokens = resolveTheme(theme, customThemes || []);
    applyTheme(tokens, accentColor || undefined);
  }, [theme, accentColor, customThemes]);
```

**Step 3: Commit**

```bash
git add src/hooks/useTheme.ts
git commit -m "feat: wire resolveTheme into useTheme hook"
```

---

### Task 4: Build the theme editor UI in SettingsPanel

**Files:**
- Modify: `src/components/settings/SettingsPanel.tsx`

This is the largest task. The theme editor is inline below the theme grid.

**Step 1: Add imports and state**

Add to the imports at top of SettingsPanel.tsx:
```typescript
import { THEMES, ACCENT_PRESETS, deriveTokens, resolveTheme, validateThemeJson } from '../../theme/themes';
import type { ThemeTokens } from '../../types';
```

Remove the old THEMES/ACCENT_PRESETS import line.

Add state inside `SettingsPanel` component (after existing useState calls):
```typescript
  const [editingTheme, setEditingTheme] = useState<ThemeTokens | null>(null);
  const [editMode, setEditMode] = useState<'smart' | 'advanced'>('smart');
  const [baseThemeId, setBaseThemeId] = useState('dotfiles-dark');
  const [smartColors, setSmartColors] = useState({
    base: '#111419', surface: '#161A21', t1: '#D8DEE9',
    accent: '#3B82F6', border: '#1A1F28', warm: '#D4A06A',
  });
  const themeImportRef = useRef<HTMLInputElement>(null);
```

**Step 2: Add helper functions**

```typescript
  const MAX_CUSTOM_THEMES = 10;
  const customThemes = settings.custom_themes || [];
  const canCreate = customThemes.length < MAX_CUSTOM_THEMES;

  const startNewTheme = () => {
    const baseT = THEMES[baseThemeId] || THEMES['dotfiles-dark'];
    const id = `custom-${Date.now()}`;
    setSmartColors({
      base: baseT.base, surface: baseT.surface, t1: baseT.t1,
      accent: baseT.accent, border: baseT.border, warm: baseT.warm,
    });
    setEditingTheme({ ...baseT, id, name: 'My Theme' });
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
    // Re-apply the actual saved theme
    const saved = settings.theme;
    update({ theme: saved });
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
    // Live preview
    applyTheme(derived);
  };

  const handleAdvancedChange = (key: keyof ThemeTokens, value: string) => {
    if (!editingTheme) return;
    const updated = { ...editingTheme, [key]: value };
    setEditingTheme(updated);
    applyTheme(updated);
  };

  const exportTheme = (t: ThemeTokens) => {
    // Use Tauri save dialog
    import('@tauri-apps/plugin-dialog').then(({ save }) => {
      save({
        defaultPath: `${t.name.replace(/[^a-zA-Z0-9]/g, '-')}.dotfiles-theme.json`,
        filters: [{ name: 'Theme', extensions: ['json'] }],
      }).then((path) => {
        if (!path) return;
        import('@tauri-apps/plugin-fs').then(({ writeTextFile }) => {
          writeTextFile(path, JSON.stringify(t, null, 2));
        });
      });
    });
  };

  const importTheme = (file: File) => {
    if (!canCreate) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result as string);
        if (!validateThemeJson(obj)) {
          alert('Invalid theme file: missing required color fields.');
          return;
        }
        // Give it a fresh ID to avoid collisions
        obj.id = `custom-${Date.now()}`;
        const updated = [...customThemes, obj as ThemeTokens];
        update({ custom_themes: updated, theme: obj.id });
      } catch {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };
```

**Step 3: Update the theme grid to show custom themes + edit/delete controls**

Replace the existing theme grid section (lines 266-284) with:

```tsx
{sectionTitle('Theme')}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 8 }}>
  {/* Built-in themes */}
  {Object.values(THEMES).map((t) => (
    <button
      key={t.id}
      onClick={() => update({ theme: t.id })}
      style={{
        padding: '10px 6px', border: settings.theme === t.id ? '2px solid var(--accent)' : '2px solid var(--border)',
        borderRadius: 8, cursor: 'pointer', background: t.base, textAlign: 'center', position: 'relative',
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
    <div key={t.id} style={{ position: 'relative' }}>
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
      {/* Edit/Delete overlay */}
      <div style={{
        position: 'absolute', top: 2, right: 2, display: 'flex', gap: 2,
        opacity: 0, transition: 'opacity 0.15s',
      }}
        className="theme-card-actions"
      >
        <button
          onClick={(e) => { e.stopPropagation(); startEditTheme(t); }}
          title="Edit"
          style={{
            width: 20, height: 20, borderRadius: 4, border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >&#9998;</button>
        <button
          onClick={(e) => { e.stopPropagation(); deleteCustomTheme(t.id); }}
          title="Delete"
          style={{
            width: 20, height: 20, borderRadius: 4, border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.5)', color: 'var(--red)', fontSize: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >&#10005;</button>
      </div>
      {/* Export button */}
      <button
        onClick={(e) => { e.stopPropagation(); exportTheme(t); }}
        title="Export theme"
        style={{
          position: 'absolute', bottom: 2, right: 2, width: 20, height: 20,
          borderRadius: 4, border: 'none', cursor: 'pointer',
          background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.15s',
        }}
        className="theme-card-actions"
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
      if (f) importTheme(f);
      e.target.value = '';
    }}
  />
  {!canCreate && (
    <span style={{ fontSize: 10, color: 'var(--t3)', alignSelf: 'center' }}>
      Max {MAX_CUSTOM_THEMES} custom themes
    </span>
  )}
</div>
```

**Step 4: Add inline theme editor (below the buttons, conditionally rendered)**

```tsx
{/* Theme editor */}
{editingTheme && (
  <div style={{
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8, padding: 16, marginBottom: 16,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>Theme Editor</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => setEditMode(editMode === 'smart' ? 'advanced' : 'smart')}
          style={{
            padding: '4px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'var(--raised)', color: 'var(--t2)',
          }}
        >{editMode === 'smart' ? 'Advanced' : 'Simple'}</button>
      </div>
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
            // Re-derive with new base
            const baseT = THEMES[e.target.value] || THEMES['dotfiles-dark'];
            const derived = deriveTokens(
              editingTheme.name, smartColors.base, smartColors.surface,
              smartColors.t1, smartColors.accent, smartColors.border, smartColors.warm, baseT,
            );
            derived.id = editingTheme.id;
            derived.name = editingTheme.name;
            setEditingTheme(derived);
            applyTheme(derived);
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
              <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>
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
                        <span style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace' }}>
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
```

**Step 5: Add CSS for hover-reveal on custom theme cards**

Add a `<style>` tag inside the SettingsPanel return (or inject via custom CSS effect). Simplest: add inline onMouseEnter/Leave to the custom theme card wrapper `<div>` to toggle opacity on the action buttons. Replace the `.theme-card-actions` className approach:

On the custom theme card `<div key={t.id}>`, add:
```tsx
onMouseEnter={(e) => {
  e.currentTarget.querySelectorAll('.theme-card-actions').forEach(
    (el) => { (el as HTMLElement).style.opacity = '1'; }
  );
}}
onMouseLeave={(e) => {
  e.currentTarget.querySelectorAll('.theme-card-actions').forEach(
    (el) => { (el as HTMLElement).style.opacity = '0'; }
  );
}}
```

**Step 6: Add applyTheme import**

Make sure SettingsPanel also imports `applyTheme`:
```typescript
import { THEMES, ACCENT_PRESETS, deriveTokens, resolveTheme, validateThemeJson, applyTheme } from '../../theme/themes';
```

**Step 7: Commit**

```bash
git add src/components/settings/SettingsPanel.tsx
git commit -m "feat: custom theme editor with smart and advanced modes"
```

---

### Task 5: Verify and build

**Step 1: Run dev build to check for TypeScript errors**

```bash
cd C:/Projects/.files && npm run dev
```

Expected: compiles with no errors, app loads. Check Settings > Appearance -- should see theme grid with "Create Theme" + "Import Theme" buttons below it.

**Step 2: Test create flow**

1. Click "Create Theme"
2. Editor should appear below with 6 color pickers in smart mode
3. Change Base color -- all depth layers should live-update
4. Toggle to Advanced -- all 24 tokens visible
5. Set name to "Test Theme", click Save
6. Theme should appear in grid with accent/surface/text swatches
7. Hover custom theme card -- edit pencil + delete X should appear

**Step 3: Test edit flow**

1. Hover "Test Theme" card, click pencil
2. Editor opens pre-populated with saved colors
3. Change accent color, see live preview
4. Click Save

**Step 4: Test delete flow**

1. Hover custom theme, click X
2. Theme removed from grid
3. If it was the active theme, reverts to .files Dark

**Step 5: Test import/export flow**

1. Create a custom theme, hover it, click export (down arrow)
2. Save dialog should open, save as .json
3. Delete the theme
4. Click "Import Theme", pick the saved .json
5. Theme should reappear in grid

**Step 6: Test 10-theme cap**

1. Create 10 custom themes
2. "Create Theme" and "Import Theme" buttons should be disabled/grayed
3. "Max 10 custom themes" text visible

**Step 7: Cargo check**

```bash
cd C:/Projects/.files/src-tauri && cargo check
```

Expected: no Rust compilation errors (serde_json::Value needs `serde_json` in deps -- check if already present).

**Step 8: Commit any fixes**

```bash
git add -A && git commit -m "fix: address build/lint issues from custom theme feature"
```

---

### Task 6: Final commit and push

**Step 1: Build release to verify**

```bash
cd C:/Projects/.files && npm run build
```

**Step 2: Push**

```bash
git push origin main
```
