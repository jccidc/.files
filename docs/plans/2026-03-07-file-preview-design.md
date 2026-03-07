# Phase 5: File Preview -- Design Document

**Date:** 2026-03-07
**Status:** Approved

---

## Overview

Upgrade the existing QuickPreview overlay into a full file preview system supporting rich rendering for code (shiki syntax highlighting), images (zoom/pan), SVG (rendered + source), markdown (GFM), video/audio (HTML5 player), and folders (stats + contents). Preview is available in three contexts: Space-bar overlay, toggleable right panel with auto-follow, and independent tabs.

---

## Architecture

### Core Principle

One `PreviewRenderer` component handles all file type detection and rendering. Three container components mount it in different contexts:

```
PreviewRenderer (pure rendering, no chrome)
  |
  +-- QuickPreview (overlay modal, Space bar)
  +-- PreviewPanel (right sidebar, toggleable)
  +-- PreviewTab (independent tab, openable from context menu)
```

### State: usePreviewStore (Zustand)

```ts
interface PreviewState {
  previewEntry: FileEntry | null;   // currently previewed file (panel/tab)
  pinned: boolean;                  // when true, selection doesn't update preview
  panelVisible: boolean;            // right panel open/closed
  panelWidth: number;               // resizable, default 350px
  overlayEntry: FileEntry | null;   // separate from panel (overlay is ephemeral)
}
```

Auto-follow logic: when `pinned === false` and `panelVisible === true`, selecting a file in the explorer updates `previewEntry`. When `pinned === true`, only explicit actions (Space, context menu "Preview") update it.

### File Type Detection

Centralized `getFileType(entry)` utility returns a discriminated union:

```ts
type FilePreviewType =
  | { kind: 'code'; language: string }
  | { kind: 'image' }
  | { kind: 'svg' }
  | { kind: 'markdown' }
  | { kind: 'video'; mime: string }
  | { kind: 'audio'; mime: string }
  | { kind: 'folder' }
  | { kind: 'unknown' }
```

---

## Preview Renderers

### CodePreview

- shiki loaded lazily (dynamic import on first use)
- `read_text_file` with 512KB max (up from 8KB)
- Line numbers, word wrap toggle, copy button in toolbar
- GPC grammar: custom TextMate `.tmLanguage.json` registered with shiki at init
- Theme: generated from app CSS variables so it matches active theme

### ImagePreview

- Tauri asset protocol (`https://asset.localhost/{path}`)
- State: `zoom` (number, 1.0 = fit), `pan` ({x, y}), `mode` ('fit' | 'actual')
- Scroll wheel = zoom (centered on cursor position)
- Click-drag = pan (only when zoomed beyond container)
- Toolbar: zoom-in, zoom-out, fit, actual-size, percentage display
- Checkerboard CSS background for transparency (repeating-conic-gradient)

### SvgPreview

- Two modes toggled by button: "Rendered" (display as `<img>`) and "Source" (CodePreview with language: 'xml')
- Rendered mode supports same zoom/pan as ImagePreview

### MarkdownPreview

- Parse with `marked` (~40KB)
- Render to HTML in styled container with GFM support (tables, task lists, strikethrough)
- Sanitize output (no script execution)
- CSS styling for generated HTML elements

### MediaPreview (Video + Audio)

- Native `<video>` / `<audio>` elements with `controls` attribute
- Source via Tauri asset protocol
- Video: contained within preview area
- Audio: centered player with filename display

### FolderPreview

- New Rust command `dir_stats(path)` for async recursive stats
- Stats grid at top: file count, folder count, total size
- Below: sorted list of immediate children (icon + name + size) via existing `read_dir`
- Total size calculation is async with loading indicator
- Capped at 100K entries to prevent hanging; returns `truncated: bool`

---

## Container Components & UX

### QuickPreview (overlay)

- Renders `PreviewRenderer` instead of inline logic
- Space to open/close, Escape to close, click backdrop to close
- 70% width (up from 60%), 80vh max height (up from 70vh)
- Header: filename, type badge, size, "Open in panel" button, "Open in tab" button

### PreviewPanel (right sidebar)

- Toggle: `Ctrl+Shift+P` hotkey, or toolbar button in explorer
- Resizable left edge (drag handle, min 250px, max 50% of window)
- Header: filename, pin/unpin toggle button, close button
- Auto-follow: on file selection change, if not pinned, update preview
- Remembers `panelVisible` and `panelWidth` in settings (persisted)

### PreviewTab

- New `TabType: 'preview'` added to the type union
- Opened via context menu "Preview in Tab" or from overlay "Open in tab" button
- Tab title = filename, tab icon = type-specific
- Behaves like any other tab (closeable, pinnable, draggable)
- Does NOT auto-follow -- always shows the specific file it was opened with

### Keyboard Shortcuts

- `Space` -- toggle overlay (existing, unchanged)
- `Ctrl+Shift+P` -- toggle preview panel
- `P` (no modifier, explorer focused) -- pin/unpin preview panel

---

## Rust Backend Additions

### dir_stats command

```rust
#[derive(Serialize)]
pub struct DirStats {
    pub file_count: u64,
    pub dir_count: u64,
    pub total_size: u64,
    pub truncated: bool,
}

#[tauri::command]
pub async fn dir_stats(path: String) -> Result<DirStats, String>
```

Async recursive walk using `walkdir`. Caps at 100K entries to prevent hanging -- returns partial results with `truncated: true`.

### read_text_file

No Rust change. Frontend calls with `max_bytes: 524288` (512KB) instead of 8192.

---

## Dependencies

### npm (new)

- `shiki` -- syntax highlighting (WASM, ~2MB, lazy loaded)
- `marked` -- markdown parsing (~40KB)

### Cargo

None new. `walkdir` already handles recursive traversal.

---

## File Manifest

### New files

| File | Purpose |
|------|---------|
| `src/components/preview/PreviewRenderer.tsx` | Core renderer, type dispatch |
| `src/components/preview/CodePreview.tsx` | Shiki-powered code viewer |
| `src/components/preview/ImagePreview.tsx` | Zoom/pan image viewer |
| `src/components/preview/SvgPreview.tsx` | Rendered + source toggle |
| `src/components/preview/MarkdownPreview.tsx` | Rendered markdown |
| `src/components/preview/MediaPreview.tsx` | Video + audio player |
| `src/components/preview/FolderPreview.tsx` | Stats + contents list |
| `src/components/preview/PreviewPanel.tsx` | Right sidebar container |
| `src/components/preview/PreviewToolbar.tsx` | Shared toolbar (zoom, pin, etc.) |
| `src/stores/previewStore.ts` | Preview Zustand store |
| `src/utils/fileType.ts` | Centralized type detection |
| `src/theme/shikiTheme.ts` | CSS variable to shiki theme bridge |

### Modified files

| File | Changes |
|------|---------|
| `QuickPreview.tsx` | Gut internals, use PreviewRenderer |
| `ExplorerTab.tsx` | Panel toggle button, auto-follow wiring |
| `types.ts` | Add `TabType: 'preview'`, `DirStats` interface |
| `src-tauri/src/commands/filesystem.rs` | Add `dir_stats` command |
| `src-tauri/src/main.rs` | Register `dir_stats` in handler |
