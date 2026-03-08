# Custom Theme Support -- Design

## Overview

Allow users to create, edit, save, import, and export custom themes. Custom themes appear alongside built-in themes in the Settings panel and support full token customization with a smart-defaults shortcut.

## Data Model

- New `custom_themes` field on `AppSettings` -- array of `ThemeTokens` objects, max 10
- Each custom theme gets a unique `id` (e.g. `custom-1709913600000`) and user-provided `name`
- `theme` setting can reference built-in or custom theme IDs
- No new Rust commands -- `custom_themes` serializes as part of existing settings JSON via `serde(default)`

### Rust Settings

```rust
// settings.rs -- add to AppSettings
#[serde(default)]
pub custom_themes: Vec<serde_json::Value>,
```

### TypeScript

```typescript
// types.ts -- add to AppSettings
custom_themes: ThemeTokens[];
```

## Theme Resolution

- `resolveTheme(id, customThemes)`: check `THEMES[id]` first, then `customThemes.find(t => t.id === id)`, fallback to `dotfiles-dark`
- Deleting the active custom theme reverts to `dotfiles-dark`
- `useTheme.ts` updated to use `resolveTheme()` instead of direct `THEMES[]` lookup

## Theme Editor (inline in Settings)

### Entry Points

- "Create Theme" button below the theme grid (disabled when 10 custom themes exist)
- Edit (pencil) icon on hover over custom theme cards in the grid
- Delete (trash) icon on hover over custom theme cards

### Editor Layout (expands inline below theme grid)

1. **Name** -- text input
2. **Base theme** -- dropdown to pick a built-in starting point
3. **Smart mode** (default) -- 6 color pickers:
   - Base, Surface, Text Primary, Accent, Border, Warm
   - Remaining 18 tokens auto-derived
4. **Advanced toggle** -- expands all 24 tokens in 4 groups:
   - Depth Layers (void, deepest, deep, base, surface, raised, hover, active)
   - Text (t1, t2, t3)
   - Semantic (accent, aglow, warm, border)
   - Status (green, red, yellow, purple, cyan)
5. **Save** / **Cancel** buttons

All changes live-preview instantly via `applyTheme()`. Cancel reverts to previous theme.

## Auto-Derivation (Smart Mode)

From 6 key colors, derive the remaining 18:

### Depth Layers (from Base)
- `void` = darken base 20%
- `deepest` = darken base 15%
- `deep` = darken base 8%
- `raised` = lighten surface 5%
- `hover` = lighten base 10%
- `active` = lighten base 18%

### Text (from Text Primary)
- `t2` = mix t1 50% with base
- `t3` = mix t1 25% with base

### Semantic (from base theme)
- `aglow` = accent at 12% alpha
- `green`, `red`, `yellow`, `purple`, `cyan` = copied from selected base theme

## Import / Export

- **Export**: button on each custom theme card, saves `<name>.dotfiles-theme.json` via Tauri save dialog
- **Import**: "Import Theme" button next to "Create Theme", opens file picker (`.json` filter), validates schema (must have all 24 token fields + name), rejects if at 10 cap
- JSON schema = full `ThemeTokens` object

## Files Changed

| File | Change |
|------|--------|
| `src/types.ts` | Add `custom_themes: ThemeTokens[]` to AppSettings |
| `src-tauri/src/models/settings.rs` | Add `custom_themes: Vec<serde_json::Value>` with serde default |
| `src/theme/themes.ts` | Add `deriveTokens()`, `resolveTheme()`, `validateThemeJson()` helpers |
| `src/hooks/useTheme.ts` | Use `resolveTheme()` with custom_themes from settings store |
| `src/components/settings/SettingsPanel.tsx` | Theme editor UI, import/export, edit/delete on custom themes |

## Constraints

- Max 10 custom themes
- ~500 bytes per theme in settings JSON
- No new Tauri commands required
- Dialog plugin already available for file picker
