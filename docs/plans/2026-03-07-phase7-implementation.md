# Phase 7: File Associations, Installer & Single-Instance -- Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add single-instance tab forwarding, Windows shell integration (context menu + default handler toggle), and NSIS installer polish to .files.

**Architecture:** Single-instance via `tauri-plugin-single-instance` forwards CLI folder args to the running instance as a Tauri event. Registry-based Windows shell integration (HKCU, no admin) via `winreg` crate for default handler toggle. NSIS installer handles context menu registration. Settings UI exposes the default handler toggle.

**Tech Stack:** Tauri v2, tauri-plugin-single-instance, winreg crate, NSIS installer config

---

### Task 1: Add Single-Instance Plugin (Rust)

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

**Step 1: Add tauri-plugin-single-instance to Cargo.toml**

Add to `[dependencies]`:
```toml
tauri-plugin-single-instance = "2"
```

**Step 2: Wire plugin in lib.rs**

In `lib.rs`, add the plugin before `.setup(...)`:

```rust
use tauri::Emitter;

// ... existing code ...

tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
        // args[0] is the exe path, args[1..] are CLI arguments
        if args.len() > 1 {
            let folder_path = args[1].clone();
            let _ = app.emit("open-folder", folder_path);
        }
        // Always bring window to front
        if let Some(w) = app.get_webview_window("main") {
            let _ = w.show();
            let _ = w.unminimize();
            let _ = w.set_focus();
        }
    }))
    .plugin(tauri_plugin_opener::init())
    // ... rest unchanged
```

**Step 3: Add single-instance permission to capabilities**

In `src-tauri/capabilities/default.json`, add to permissions array:
```json
"single-instance:default"
```

**Step 4: Build to verify Rust compiles**

Run: `cd C:\Projects\.files && npm run tauri build -- --debug 2>&1 | tail -20`
Expected: Compiles without errors (ignore warnings)

**Step 5: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src-tauri/capabilities/default.json
git commit -m "feat: add single-instance plugin with folder arg forwarding"
```

---

### Task 2: Handle open-folder Event in Frontend

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/stores/panels.ts` (if needed -- verify `addTab` exists)

**Step 1: Add Tauri event listener in App.tsx**

Import `listen` from `@tauri-apps/api/event` and add a `useEffect` that listens for the `open-folder` event. When received, open a new explorer tab in the focused panel with the given path.

Add this import:
```tsx
import { listen } from '@tauri-apps/api/event';
```

Add this useEffect after the existing ones (~line 49):
```tsx
// Listen for single-instance folder open
useEffect(() => {
  const unlisten = listen<string>('open-folder', (event) => {
    const folderPath = event.payload;
    if (!folderPath) return;
    const pid = usePanelsStore.getState().focusedPanelId || DEFAULT_PANEL_ID;
    usePanelsStore.getState().addTab(pid, {
      id: crypto.randomUUID(),
      type: 'explorer',
      title: folderPath.split('\\').pop() || 'Explorer',
      path: folderPath,
      pinned: false,
    });
  });
  return () => { unlisten.then((fn) => fn()); };
}, []);
```

**Step 2: Run dev mode to verify no TS errors**

Run: `cd C:\Projects\.files && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: handle open-folder event to create new explorer tab"
```

---

### Task 3: Add Registry Commands for Default Handler Toggle (Rust)

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/commands/registry.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add winreg to Cargo.toml**

Add to `[dependencies]`:
```toml
winreg = "0.55"
```

**Step 2: Create registry.rs with two commands**

Create `src-tauri/src/commands/registry.rs`:

```rust
use winreg::enums::*;
use winreg::RegKey;

/// Check if .files is the default folder handler
#[tauri::command]
pub fn is_default_folder_handler() -> Result<bool, String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let key = hkcu
        .open_subkey(r"Software\Classes\Directory\shell")
        .map_err(|e| e.to_string())?;
    let val: Result<String, _> = key.get_value("");
    Ok(val.map(|v| v == "dotfiles").unwrap_or(false))
}

/// Set or unset .files as the default folder handler
#[tauri::command]
pub fn set_default_folder_handler(enable: bool) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    if enable {
        // Set .files as default verb for directories
        let (key, _) = hkcu
            .create_subkey(r"Software\Classes\Directory\shell")
            .map_err(|e| e.to_string())?;
        key.set_value("", &"dotfiles").map_err(|e| e.to_string())?;

        // Register the dotfiles verb with exe path
        let exe_path = std::env::current_exe()
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .to_string();

        let (verb_key, _) = hkcu
            .create_subkey(r"Software\Classes\Directory\shell\dotfiles")
            .map_err(|e| e.to_string())?;
        verb_key.set_value("", &"Open with .files").map_err(|e| e.to_string())?;
        verb_key.set_value("Icon", &exe_path).map_err(|e| e.to_string())?;

        let (cmd_key, _) = hkcu
            .create_subkey(r"Software\Classes\Directory\shell\dotfiles\command")
            .map_err(|e| e.to_string())?;
        let cmd = format!("\"{}\" \"%1\"", exe_path);
        cmd_key.set_value("", &cmd).map_err(|e| e.to_string())?;
    } else {
        // Remove default verb (revert to Explorer)
        let key = hkcu
            .open_subkey_with_flags(r"Software\Classes\Directory\shell", KEY_SET_VALUE)
            .map_err(|e| e.to_string())?;
        // Delete the default value to revert
        let _ = key.delete_value("");

        // Remove the dotfiles verb entirely
        let _ = hkcu.delete_subkey_all(r"Software\Classes\Directory\shell\dotfiles");
    }

    Ok(())
}
```

**Step 3: Register module in mod.rs**

Add to `src-tauri/src/commands/mod.rs`:
```rust
pub mod registry;
```

**Step 4: Register commands in lib.rs**

Add import:
```rust
use commands::{cloud, filesystem, git, registry, search, settings, shell, terminal, watcher};
```

Add to `invoke_handler`:
```rust
registry::is_default_folder_handler,
registry::set_default_folder_handler,
```

**Step 5: Build to verify Rust compiles**

Run: `cd C:\Projects\.files && npm run tauri build -- --debug 2>&1 | tail -20`
Expected: Compiles without errors

**Step 6: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/commands/registry.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs
git commit -m "feat: add registry commands for default folder handler toggle"
```

---

### Task 4: Add Frontend API + Settings Toggle

**Files:**
- Create: `src/api/registry.ts`
- Modify: `src/components/settings/SettingsPanel.tsx`

**Step 1: Create registry API wrapper**

Create `src/api/registry.ts`:
```ts
import { invoke } from '@tauri-apps/api/core';

export async function isDefaultFolderHandler(): Promise<boolean> {
  return invoke<boolean>('is_default_folder_handler');
}

export async function setDefaultFolderHandler(enable: boolean): Promise<void> {
  return invoke('set_default_folder_handler', { enable });
}
```

**Step 2: Add toggle in SettingsPanel Explorer section**

In `src/components/settings/SettingsPanel.tsx`, find the Explorer section. Add a toggle for "Set as default folder handler" that:
1. On mount (when Explorer section renders), calls `isDefaultFolderHandler()` to get current state
2. On toggle, calls `setDefaultFolderHandler(newValue)`
3. Shows the toggle with label "Default folder handler" and description "Double-click folders to open in .files instead of Explorer"

Add imports:
```tsx
import { isDefaultFolderHandler, setDefaultFolderHandler } from '../../api/registry';
```

Add state inside the component:
```tsx
const [isDefaultHandler, setIsDefaultHandler] = useState(false);

useEffect(() => {
  isDefaultFolderHandler().then(setIsDefaultHandler).catch(() => {});
}, []);

const handleDefaultHandlerToggle = async () => {
  const next = !isDefaultHandler;
  try {
    await setDefaultFolderHandler(next);
    setIsDefaultHandler(next);
  } catch (e) {
    console.error('Failed to set default handler:', e);
  }
};
```

Add the toggle UI in the Explorer section (use the same toggle pattern already used in the panel for other boolean settings like show_hidden, show_extensions, etc.):

```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
  <div>
    <div style={{ color: 'var(--t1)', fontSize: 13 }}>Default folder handler</div>
    <div style={{ color: 'var(--t3)', fontSize: 11 }}>Open folders in .files instead of Explorer</div>
  </div>
  <button
    onClick={handleDefaultHandlerToggle}
    style={{
      width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
      background: isDefaultHandler ? 'var(--accent)' : 'var(--border)',
      position: 'relative', transition: 'background 0.2s',
    }}
  >
    <div style={{
      width: 14, height: 14, borderRadius: 7, background: '#fff',
      position: 'absolute', top: 3,
      left: isDefaultHandler ? 19 : 3,
      transition: 'left 0.2s',
    }} />
  </button>
</div>
```

**Step 3: Verify TypeScript compiles**

Run: `cd C:\Projects\.files && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/api/registry.ts src/components/settings/SettingsPanel.tsx
git commit -m "feat: add default folder handler toggle in Settings > Explorer"
```

---

### Task 5: Configure NSIS Installer

**Files:**
- Modify: `src-tauri/tauri.conf.json`

**Step 1: Add NSIS config to tauri.conf.json**

Add `windows` section inside `bundle`:

```json
{
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "oneClick": false,
        "perMachine": false,
        "allowElevation": true,
        "createDesktopShortcut": true,
        "createStartMenuShortcut": true,
        "shortcutName": ".files",
        "displayLanguageSelector": false
      }
    }
  }
}
```

Note: Changed `targets` from `"all"` to `["nsis"]` to only build NSIS installer.

**Step 2: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat: configure NSIS installer with shortcuts and per-user install"
```

---

### Task 6: Add NSIS Sidecar Script for Context Menu Registration

**Files:**
- Create: `src-tauri/nsis/installer.nsi` (custom NSIS hooks)
- Modify: `src-tauri/tauri.conf.json` (add installerHooks path)

**Step 1: Create NSIS installer hooks script**

Tauri v2 supports `installerHooks` in NSIS config -- a `.nsi` file with custom functions called during install/uninstall.

Create `src-tauri/nsis/installer.nsi`:

```nsi
!macro CUSTOM_INSTALL
  ; Register "Open with .files" context menu for directories
  WriteRegStr HKCU "Software\Classes\Directory\shell\dotfiles" "" "Open with .files"
  WriteRegStr HKCU "Software\Classes\Directory\shell\dotfiles" "Icon" "$INSTDIR\dotfiles.exe"
  WriteRegStr HKCU "Software\Classes\Directory\shell\dotfiles\command" "" '"$INSTDIR\dotfiles.exe" "%1"'

  ; Also register for Directory\Background (right-click in empty space)
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\dotfiles" "" "Open with .files"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\dotfiles" "Icon" "$INSTDIR\dotfiles.exe"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\dotfiles\command" "" '"$INSTDIR\dotfiles.exe" "%V"'
!macroend

!macro CUSTOM_UNINSTALL
  ; Remove context menu entries
  DeleteRegKey HKCU "Software\Classes\Directory\shell\dotfiles"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\dotfiles"

  ; If .files was set as default handler, revert
  ReadRegStr $0 HKCU "Software\Classes\Directory\shell" ""
  ${If} $0 == "dotfiles"
    DeleteRegValue HKCU "Software\Classes\Directory\shell" ""
  ${EndIf}
!macroend
```

**Step 2: Reference hooks in tauri.conf.json**

Add `installerHooks` to the nsis config:
```json
"nsis": {
  "oneClick": false,
  "perMachine": false,
  "allowElevation": true,
  "createDesktopShortcut": true,
  "createStartMenuShortcut": true,
  "shortcutName": ".files",
  "displayLanguageSelector": false,
  "installerHooks": "nsis/installer.nsi"
}
```

**Step 3: Commit**

```bash
git add src-tauri/nsis/installer.nsi src-tauri/tauri.conf.json
git commit -m "feat: NSIS hooks for context menu registration on install/uninstall"
```

---

### Task 7: Build & Smoke Test

**Step 1: Run full release build**

Run: `cd C:\Projects\.files && npm run tauri build 2>&1 | tail -30`
Expected: Build succeeds, produces `.exe` installer in `src-tauri/target/release/bundle/nsis/`

**Step 2: Manual smoke test checklist**

- [ ] Run installer -- installs to chosen directory, creates shortcuts
- [ ] Right-click a folder in Windows Explorer -- "Open with .files" appears
- [ ] Click "Open with .files" -- .files opens with that folder as active tab
- [ ] With .files already running, right-click another folder -- new tab opens in existing window
- [ ] Settings > Explorer > "Default folder handler" toggle works
- [ ] When enabled, double-clicking a folder opens .files
- [ ] When disabled, double-clicking reverts to Explorer
- [ ] Uninstall -- context menu entries removed, shortcuts removed

**Step 3: Final commit**

```bash
git commit -m "chore: Phase 7 complete — file associations, installer, single-instance"
```

---

### Summary of Changes

| File | Action | Purpose |
|------|--------|---------|
| `src-tauri/Cargo.toml` | Modify | Add single-instance + winreg deps |
| `src-tauri/src/lib.rs` | Modify | Wire single-instance plugin + registry commands |
| `src-tauri/src/commands/registry.rs` | Create | Default handler get/set via HKCU registry |
| `src-tauri/src/commands/mod.rs` | Modify | Register registry module |
| `src-tauri/capabilities/default.json` | Modify | Add single-instance permission |
| `src-tauri/tauri.conf.json` | Modify | NSIS config with hooks |
| `src-tauri/nsis/installer.nsi` | Create | Context menu registry on install/uninstall |
| `src/App.tsx` | Modify | Listen for open-folder event |
| `src/api/registry.ts` | Create | Frontend API for registry commands |
| `src/components/settings/SettingsPanel.tsx` | Modify | Default handler toggle UI |

### Future TODO (not in this plan)

- Auto-update via `tauri-plugin-updater` (needs public URL for update manifest)
- Portable/zip distribution
