# Phase 7: File Associations, Installer & Single-Instance

**Date:** 2026-03-07
**Status:** Approved

## Summary

Complete Phase 7 of .files with three features: single-instance tab forwarding, Windows shell integration (context menu + default handler toggle), and NSIS installer polish. Auto-update deferred to future phase.

## 1. Single-Instance + Tab Forwarding

**Plugin:** `tauri-plugin-single-instance`

When a second instance launches with a folder path argument, the plugin forwards args to the running instance. The callback in `lib.rs` emits an `open-folder` event to the frontend, which opens a new Explorer tab navigated to that path.

- **Rust:** Add plugin in `Cargo.toml` + `.plugin(tauri_plugin_single_instance::init(...))` in `lib.rs`
- **Frontend:** Listen for `open-folder` event in `App.tsx`, call the tab store to create a new Explorer tab at the given path
- **CLI args:** Accept `dotfiles.exe <folder_path>` -- parse in the single-instance callback
- **Tray restore:** If window is hidden (close-to-tray), show + focus it before opening the tab

## 2. Context Menu ("Open with .files")

NSIS installer writes registry keys during install:

```
HKCU\Software\Classes\Directory\shell\dotfiles
  (Default) = "Open with .files"
  Icon = "<install_path>\dotfiles.exe"

HKCU\Software\Classes\Directory\shell\dotfiles\command
  (Default) = "<install_path>\dotfiles.exe" "%1"
```

- Uses HKCU (no admin needed)
- NSIS removes keys on uninstall
- Implemented via NSIS sidecar script in `src-tauri/nsis/`

## 3. Default Folder Handler Toggle

Settings > Explorer panel toggle: **"Set as default folder handler"**

When enabled, Rust writes:
```
HKCU\Software\Classes\Directory\shell
  (Default) = "dotfiles"
```

When disabled, Rust removes the value (reverts to Windows Explorer).

- Uses `winreg` crate -- HKCU writes need no elevation
- Setting persisted in `AppSettings` (`default_folder_handler: bool`)
- On launch, Rust checks registry to sync the toggle state

## 4. NSIS Installer

Config in `tauri.conf.json` under `bundle.windows.nsis`:

- `oneClick: false` -- custom install directory selection
- `perMachine: false` -- per-user install by default
- `allowElevation: true` -- user can choose per-machine if desired
- `createDesktopShortcut: true`
- `createStartMenuShortcut: true`
- `shortcutName: ".files"`
- Icon: existing `icon.ico`

NSIS sidecar script handles context menu registry on install/uninstall.

## 5. Auto-Update (Deferred)

Not implemented now. Future TODO:
- Host update manifest on VPS or make repo public
- Add `tauri-plugin-updater`
- Add update check UI in Settings

## Dependencies

| Crate/Plugin | Purpose |
|---|---|
| `tauri-plugin-single-instance` | Forward args to running instance |
| `winreg` | Read/write Windows registry (HKCU) |

No new frontend dependencies.

## Out of Scope

- Shell extension DLL (registry-based context menu is sufficient)
- Auto-update (deferred)
- Portable/zip distribution (installer only)
- Per-machine install by default (user can elevate if desired)
