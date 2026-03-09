# Font Management -- Design

## Overview

System font detection + custom font import. Users can pick from any installed font or add their own .ttf/.otf/.woff2 files.

## Rust Commands

### `list_system_fonts`
- Scans `C:\Windows\Fonts` + `%LOCALAPPDATA%\Microsoft\Windows\Fonts` for .ttf, .otf, .woff2
- Extracts font family names from filenames (strip extension, collapse Bold/Italic/Regular variants)
- Returns deduplicated, sorted `Vec<String>`

### `install_custom_font`
- Takes source file path (from dialog picker)
- Copies to `%APPDATA%\.files\fonts\<filename>`
- Returns font family name + stored filename

### `remove_custom_font`
- Deletes file from `%APPDATA%\.files\fonts\`

## Settings

```typescript
custom_fonts: { name: string; file: string }[]  // name = family, file = filename in fonts dir
```

Rust side: `Vec<serde_json::Value>` (same pattern as custom_themes).

## Frontend

### @font-face registration
- `useTheme` iterates `custom_fonts` on load, injects `@font-face` rules
- Font file URLs via `convertFileSrc()` pointing to app data fonts dir
- Updates dynamically when fonts added/removed

### UI (SettingsPanel)
- Font dropdown with grouped options: Bundled (JetBrains Mono, Outfit), Custom (if any), System (detected)
- "Add Font..." button next to dropdown -- Tauri file dialog (.ttf,.otf,.woff2), copies file, adds to custom_fonts, selects it
- Custom fonts show (x) delete button on hover
- System fonts cached in component state (fetched once on Appearance mount)

## Files Changed

| File | Change |
|------|--------|
| `src-tauri/src/commands/fonts.rs` | New: 3 commands |
| `src-tauri/src/commands/mod.rs` | Register fonts module |
| `src-tauri/src/lib.rs` | Register commands |
| `src/api/fonts.ts` | New: Tauri invoke wrappers |
| `src/types.ts` | Add custom_fonts to AppSettings |
| `src-tauri/src/models/settings.rs` | Add custom_fonts field |
| `src/stores/settings.ts` | Add to DEFAULT_SETTINGS |
| `src/hooks/useTheme.ts` | @font-face injection |
| `src/components/settings/SettingsPanel.tsx` | Font picker UI |
