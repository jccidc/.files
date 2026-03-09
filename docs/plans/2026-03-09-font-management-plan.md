# Font Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users pick from detected system fonts or import custom .ttf/.otf/.woff2 files.

**Architecture:** New Rust `fonts` command module scans Windows font directories and manages custom font file storage. Frontend registers custom fonts via @font-face injection in useTheme, and SettingsPanel gets a grouped font dropdown with "Add Font..." button.

**Tech Stack:** Rust (walkdir, dirs, std::fs), Tauri v2 dialog+fs plugins, React, @font-face CSS injection

---

### Task 1: Data model -- add custom_fonts field

**Files:**
- Modify: `src/types.ts`
- Modify: `src-tauri/src/models/settings.rs`
- Modify: `src/stores/settings.ts`

**Step 1: Add CustomFont type and field to TypeScript**

In `src/types.ts`, add before AppSettings:
```typescript
export interface CustomFont {
  name: string;  // font family name
  file: string;  // filename in app fonts dir
}
```

In AppSettings, add after `custom_themes`:
```typescript
  custom_fonts: CustomFont[];
```

**Step 2: Add to Rust settings**

In `src-tauri/src/models/settings.rs`, add after `custom_themes` field:
```rust
    #[serde(default)]
    pub custom_fonts: Vec<serde_json::Value>,
```

In Default impl, add:
```rust
            custom_fonts: Vec::new(),
```

**Step 3: Add to DEFAULT_SETTINGS**

In `src/stores/settings.ts`, add after `custom_themes`:
```typescript
  custom_fonts: [],
```

**Step 4: Commit**
```
feat: add custom_fonts field to data model
```

---

### Task 2: Rust fonts command module

**Files:**
- Create: `src-tauri/src/commands/fonts.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Create fonts.rs**

```rust
use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

/// Get the app's custom fonts directory: <config_dir>/.files/fonts/
fn fonts_dir() -> Result<PathBuf, String> {
    let config = dirs::config_dir().ok_or("Could not determine config directory")?;
    Ok(config.join(".files").join("fonts"))
}

/// Extract a font family name from a filename.
/// "JetBrainsMono-Bold.ttf" -> "JetBrains Mono" is too hard without parsing the font file.
/// Instead, strip extension and common suffixes, then return as-is.
fn family_from_filename(name: &str) -> String {
    let stem = name.rsplit('.').skip(1).collect::<Vec<_>>().into_iter().rev().collect::<Vec<_>>().join(".");
    // Strip common weight/style suffixes
    let suffixes = ["-Regular", "-Bold", "-Italic", "-BoldItalic", "-Light", "-Medium",
                    "-SemiBold", "-ExtraBold", "-Thin", "-ExtraLight", "-Black",
                    " Regular", " Bold", " Italic", " BoldItalic", " Light", " Medium"];
    let mut result = stem.to_string();
    for s in &suffixes {
        if let Some(stripped) = result.strip_suffix(s) {
            result = stripped.to_string();
            break;
        }
    }
    result
}

#[tauri::command]
pub fn list_system_fonts() -> Result<Vec<String>, String> {
    let mut families = BTreeSet::new();

    // Windows system font directories
    let mut dirs_to_scan: Vec<PathBuf> = vec![];

    // C:\Windows\Fonts
    if let Ok(windir) = std::env::var("WINDIR") {
        dirs_to_scan.push(PathBuf::from(windir).join("Fonts"));
    }

    // %LOCALAPPDATA%\Microsoft\Windows\Fonts (user-installed fonts)
    if let Some(local) = dirs::data_local_dir() {
        dirs_to_scan.push(local.join("Microsoft").join("Windows").join("Fonts"));
    }

    let valid_exts = ["ttf", "otf", "woff2", "ttc"];

    for dir in dirs_to_scan {
        if !dir.exists() { continue; }
        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    if valid_exts.contains(&ext.to_lowercase().as_str()) {
                        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                            families.insert(family_from_filename(name));
                        }
                    }
                }
            }
        }
    }

    Ok(families.into_iter().collect())
}

#[tauri::command]
pub fn install_custom_font(source_path: String) -> Result<serde_json::Value, String> {
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err("Font file not found".to_string());
    }

    let filename = source.file_name()
        .ok_or("Invalid filename")?
        .to_str()
        .ok_or("Invalid filename encoding")?
        .to_string();

    let dest_dir = fonts_dir()?;
    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let dest = dest_dir.join(&filename);
    fs::copy(&source, &dest).map_err(|e| e.to_string())?;

    let family = family_from_filename(&filename);

    Ok(serde_json::json!({
        "name": family,
        "file": filename
    }))
}

#[tauri::command]
pub fn remove_custom_font(filename: String) -> Result<(), String> {
    let dest = fonts_dir()?.join(&filename);
    if dest.exists() {
        fs::remove_file(&dest).map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

**Step 2: Register in mod.rs**

Add to `src-tauri/src/commands/mod.rs`:
```rust
pub mod fonts;
```

**Step 3: Register in lib.rs**

Add use import:
```rust
use commands::{cloud, filesystem, fonts, git, registry, search, settings, shell, terminal, watcher};
```

Add to invoke_handler (after `registry::set_default_folder_handler`):
```rust
            fonts::list_system_fonts,
            fonts::install_custom_font,
            fonts::remove_custom_font,
```

**Step 4: Verify**
```
cargo check
```

**Step 5: Commit**
```
feat: add Rust fonts module with system detection and custom font install/remove
```

---

### Task 3: Frontend API + @font-face injection

**Files:**
- Create: `src/api/fonts.ts`
- Modify: `src/hooks/useTheme.ts`

**Step 1: Create fonts API wrapper**

```typescript
import { invoke } from '@tauri-apps/api/core';

export async function listSystemFonts(): Promise<string[]> {
  return invoke('list_system_fonts');
}

export async function installCustomFont(sourcePath: string): Promise<{ name: string; file: string }> {
  return invoke('install_custom_font', { sourcePath });
}

export async function removeCustomFont(filename: string): Promise<void> {
  return invoke('remove_custom_font', { filename });
}
```

**Step 2: Add @font-face injection to useTheme**

In `src/hooks/useTheme.ts`, add a new import:
```typescript
import { convertFileSrc } from '@tauri-apps/api/core';
import { appConfigDir } from '@tauri-apps/api/path';
```

Add a new selector after `customCss`:
```typescript
  const customFonts = useSettingsStore((s) => s.settings.custom_fonts);
```

Add a new useRef:
```typescript
  const fontStyleRef = useRef<HTMLStyleElement | null>(null);
```

Add a new useEffect (after the custom CSS effect):
```typescript
  // Custom font @font-face injection
  useEffect(() => {
    if (!fontStyleRef.current) {
      fontStyleRef.current = document.createElement('style');
      fontStyleRef.current.id = 'dotfiles-custom-fonts';
      document.head.appendChild(fontStyleRef.current);
    }

    const fonts = customFonts || [];
    if (fonts.length === 0) {
      fontStyleRef.current.textContent = '';
      return;
    }

    // Build @font-face rules async (need config dir path)
    (async () => {
      try {
        const configDir = await appConfigDir();
        const rules = fonts.map((f: any) => {
          const url = convertFileSrc(`${configDir}fonts/${f.file}`);
          return `@font-face { font-family: '${f.name}'; src: url('${url}'); }`;
        }).join('\n');
        if (fontStyleRef.current) {
          fontStyleRef.current.textContent = rules;
        }
      } catch {}
    })();

    return () => {
      if (fontStyleRef.current) {
        fontStyleRef.current.remove();
        fontStyleRef.current = null;
      }
    };
  }, [customFonts]);
```

**Step 3: Commit**
```
feat: font API wrappers and @font-face injection in useTheme
```

---

### Task 4: SettingsPanel font picker UI

**Files:**
- Modify: `src/components/settings/SettingsPanel.tsx`

**Step 1: Add imports and state**

Add imports:
```typescript
import { listSystemFonts, installCustomFont, removeCustomFont } from '../../api/fonts';
import type { CustomFont } from '../../types';
```

Add state inside component (near other useState calls):
```typescript
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [fontsLoaded, setFontsLoaded] = useState(false);
```

Add effect to load system fonts when Appearance section is active:
```typescript
  useEffect(() => {
    if (section === 'appearance' && !fontsLoaded) {
      listSystemFonts().then((fonts) => {
        setSystemFonts(fonts);
        setFontsLoaded(true);
      }).catch(() => setFontsLoaded(true));
    }
  }, [section, fontsLoaded]);
```

**Step 2: Add font management helpers**

```typescript
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
```

**Step 3: Replace the font dropdown**

Find the existing font section (search for `sectionTitle('Font')` and the `<select>` with font options). Replace the select with a grouped dropdown + Add Font button:

Replace the entire font family select block with:

```tsx
              {sectionTitle('Font')}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>UI Font Family</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={settings.font_family}
                    onChange={(e) => update({ font_family: e.target.value })}
                    style={{ ...selectStyle, flex: 1 }}
                  >
                    <optgroup label="Bundled">
                      <option value="JetBrains Mono">JetBrains Mono</option>
                      <option value="Outfit">Outfit</option>
                    </optgroup>
                    {customFonts.length > 0 && (
                      <optgroup label="Custom">
                        {customFonts.map((f) => (
                          <option key={f.file} value={f.name}>{f.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {systemFonts.length > 0 && (
                      <optgroup label="System">
                        {systemFonts.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
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
                {/* Custom font list with delete */}
                {customFonts.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {customFonts.map((f) => (
                      <div key={f.file} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '4px 8px', fontSize: 11, color: 'var(--t2)',
                        background: 'var(--surface)', borderRadius: 4, marginBottom: 4,
                      }}>
                        <span>{f.name} <span style={{ color: 'var(--t3)', fontSize: 10 }}>({f.file})</span></span>
                        <button
                          onClick={() => handleRemoveFont(f)}
                          title="Remove font"
                          style={{
                            border: 'none', background: 'transparent', cursor: 'pointer',
                            color: 'var(--red)', fontSize: 12, padding: '2px 4px',
                          }}
                        >x</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
```

**Step 4: Verify**
```
npx tsc --noEmit
```

**Step 5: Commit**
```
feat: font picker UI with system detection, custom import, and grouped dropdown
```

---

### Task 5: Verify and push

**Step 1: Run dev build**
```
cargo tauri dev
```

**Step 2: Test flows**
1. Settings > Appearance > Font -- dropdown should show Bundled (2), System (many), grouped
2. Click "+ Add Font" -- file picker opens, select a .ttf
3. Font appears in Custom group, gets selected, text updates
4. Custom font shows in list below dropdown with (x) delete
5. Delete custom font -- reverts to JetBrains Mono if it was active
6. System fonts all listed and selectable

**Step 3: Push**
```
git push origin main
```
