# .files -- Next Session TODO

## Bugs to Fix
- [ ] **Shift+click range select** -- was fixed (sortedIndex tracking) but needs testing to confirm full row highlighting works across group headers and peek rows
- [ ] **Gradient accent `--active` as gradient string** -- `applyTheme()` sets `--active` to a `linear-gradient()` when gradient_accent is on, but some components use `var(--active)` in non-background contexts (e.g. border-color). May cause visual glitches. Fix: use separate `--active-bg` variable for gradient, keep `--active` as solid color
- [ ] **Selection glow needs testing** -- CSS animation uses `!important` to override inline styles; verify it actually pulses in Tauri webview
- [ ] **Neon mode needs testing** -- borders/shadows use `!important`; verify sidebar/toolbar glow shows
- [ ] **Window effects still look similar** -- auto-opacity adjustment was added but needs user testing with different wallpapers. Mica pulls from wallpaper color, may be subtle on dark wallpapers

## Features to Build
- [ ] **Custom icon pack import** -- user asked about mechanics; design was discussed but not built. Allow importing SVG icon sets as custom themes. Need: file picker, icon mapping config, storage in appConfigDir
- [ ] **Folder icons upgrade** -- Material Icon Theme has special folder SVGs (src/, node_modules/, .git/, docs/). Could map well-known folder names to unique icons
- [ ] **Tabs drag-to-reorder** -- panels store has `reorderTabs` but UI not wired
- [ ] **Batch file operations progress bar** -- currently no progress feedback on large copy/move
- [ ] **Animations + responsive polish** -- Phase 8 from original plan

## Testing Checklist
- [ ] Ctrl+click to toggle individual file selection
- [ ] Shift+click to select range of files (full row highlight, not text selection)
- [ ] Ctrl+Shift+click to add range to existing selection
- [ ] All 6 radical theming toggles (gradient accent, selection glow, neon mode, accent-tinted text, rainbow folders, adaptive accent)
- [ ] Secondary accent color picker
- [ ] Window effect auto-opacity (click Acrylic -> opacity should drop to 60%)
- [ ] Icon themes: Monochrome (outline), Minimal (grayscale material), Colorful (full color material)
- [ ] Properties dialog (right-click > Properties)
- [ ] Cross-pane drag/drop
- [ ] Tooltip clears on click (no more stuck tooltips)
- [ ] Sidebar Quick Access navigates to correct (focused) panel tab

## Commit Needed
- [ ] All changes from 2026-03-13 sessions are UNCOMMITTED -- commit when testing passes
