# .files — Build Plan & Architecture

Windows-native file explorer replacement built on Tauri v2 with a React/TypeScript frontend and Rust backend. Developer cockpit where terminal is a first-class citizen alongside the file explorer — not a bottom panel.

**Repo:** github.com/200df7/.files (private)
**Generated:** March 7, 2026

---

## Decisions

- **Tauri v2 + Rust backend** — WebView2 (already on Win10/11), ~5MB bundle, ~30MB RAM. No Electron.
- **React 19 + TypeScript + Vite** — fast UI iteration, Zustand for state, Tailwind CSS for styling
- **Two tab types: Explorer + Terminal (PowerShell)** — no separate Claude REPL tab. Run `claude` inside PowerShell if needed.
- **Rust for all filesystem ops** — walkdir, notify, portable-pty, serde settings. No Node.js perf-critical paths.
- **Full Git client in sidebar** — GitHub auth, repo browser, branch management, staging, diffs, commit/push/pull. Not just status badges.
- **Type-aware file preview** — code (syntax highlighted), images (zoom/pan), SVG (rendered + source), markdown (rendered), video/audio (native player), folders (stats + contents)
- **Space bar quick preview** — macOS Quick Look style instant overlay
- **Settings panel** — gear icon, 4 core sections (Appearance, Explorer, Terminal, Keybindings), JSON-persisted via Rust
- **Recycle Bin support** — delete sends to Recycle Bin via Windows Shell API, not permanent delete
- **Ctrl+L address bar** — breadcrumb toggles to editable path input

## Rejected / Deferred to v2

- Cloud OAuth integration (GDrive/OneDrive already mount as local drives)
- Tantivy full-text search index (walkdir + fuzzy-matcher is enough for v1)
- File tags system
- Multi-window tab tear-off (keep splits within single window)
- PDF preview (let OS handle it)
- Custom theme JSON import (ship 3 built-in themes)
- NTFS MFT direct read
- Miller columns view
- Plugin system

---

## Tech Stack

```
Runtime:        Tauri v2 (WebView2 on Windows)
Frontend:       React 19 + TypeScript + Vite
State:          Zustand
Styling:        Tailwind CSS + CSS custom properties (theme engine)
Terminal UI:    xterm.js (GPU-accelerated)
Backend:        Rust (Tauri commands + background services)
File System:    walkdir + notify (Rust crates)
Search:         walkdir + fuzzy-matcher
Thumbnails:     image crate (Rust-native)
Terminal PTY:   portable-pty (Rust, spawns real shell sessions)
Git:            git2 crate (libgit2) + GitHub REST API via reqwest
Build:          Vite (frontend) + cargo (backend) + tauri build (NSIS installer)
Settings:       JSON via serde (Rust) + Zustand persist (frontend)
```

---

## Architecture

```
+----------------------------------------------------------+
|                    React Frontend                         |
|  +----------+  +----------+  +-----------+  +----------+ |
|  | Explorer  |  | Terminal  |  | Settings  |  | Preview  | |
|  |   Tab     |  |   Tab     |  |  Panel    |  |  Panel   | |
|  +-----+----+  +-----+----+  +-----+-----+  +----+-----+ |
|        |              |              |              |       |
|  ------+--------------+--------------+--------------+----- |
|                    invoke() / listen()                      |
|               (Tauri IPC - serialized JSON)                 |
+----------------------------+-------------------------------+
                             |
+----------------------------+-------------------------------+
|                     Rust Backend                            |
|  +------------+  +------------+  +---------------------+   |
|  | FileSystem |  |  Terminal   |  |   Services          |   |
|  |  Commands  |  |  Manager    |  |  +- FileWatcher     |   |
|  |            |  |             |  |  +- SearchIndex     |   |
|  |  read_dir  |  |  spawn_pty  |  |  +- ThumbnailGen    |   |
|  |  stat_file |  |  write_pty  |  |  +- GitOps          |   |
|  |  watch_dir |  |  resize_pty |  |  +- SettingsIO      |   |
|  |  search    |  |  kill_pty   |  |                     |   |
|  +------------+  +------------+  +---------------------+   |
|                                                             |
|  Native OS: Win32 API, Registry, Recycle Bin (IFileOp)      |
+-------------------------------------------------------------+
```

---

## Project Structure

```
.files/
+-- src-tauri/
|   +-- Cargo.toml
|   +-- tauri.conf.json
|   +-- capabilities/
|   |   +-- default.json
|   +-- src/
|   |   +-- main.rs
|   |   +-- lib.rs
|   |   +-- commands/
|   |   |   +-- mod.rs
|   |   |   +-- filesystem.rs      # read_dir, stat, copy, move, delete, rename
|   |   |   +-- terminal.rs        # spawn_pty, write_pty, resize_pty, kill_pty
|   |   |   +-- search.rs          # fuzzy_find, filter
|   |   |   +-- settings.rs        # load_settings, save_settings
|   |   |   +-- git.rs             # status, branch, stage, commit, push, pull, diff
|   |   |   +-- thumbnail.rs       # generate_thumbnail, get_cached
|   |   |   +-- shell.rs           # open_in_explorer, sys_info
|   |   +-- services/
|   |   |   +-- mod.rs
|   |   |   +-- watcher.rs         # notify-based file watcher
|   |   |   +-- indexer.rs         # background file indexer
|   |   |   +-- thumbcache.rs      # thumbnail LRU cache
|   |   |   +-- pty_manager.rs     # PTY session pool
|   |   +-- models/
|   |   |   +-- mod.rs
|   |   |   +-- file_entry.rs
|   |   |   +-- dir_listing.rs
|   |   |   +-- settings.rs
|   |   +-- utils/
|   |       +-- mod.rs
|   |       +-- natural_sort.rs
|   |       +-- file_icons.rs
|   |       +-- path_utils.rs
|   |       +-- size_fmt.rs
|   +-- icons/
|   +-- build.rs
|
+-- src/
|   +-- main.tsx
|   +-- App.tsx
|   +-- api/
|   |   +-- filesystem.ts
|   |   +-- terminal.ts
|   |   +-- search.ts
|   |   +-- settings.ts
|   |   +-- git.ts
|   +-- components/
|   |   +-- titlebar/
|   |   |   +-- Titlebar.tsx
|   |   |   +-- SearchBar.tsx
|   |   +-- sidebar/
|   |   |   +-- Sidebar.tsx
|   |   |   +-- SourcesList.tsx
|   |   |   +-- FileTree.tsx
|   |   |   +-- GitPanel.tsx
|   |   +-- tabs/
|   |   |   +-- TabManager.tsx
|   |   |   +-- TabBar.tsx
|   |   |   +-- TabContent.tsx
|   |   +-- explorer/
|   |   |   +-- ExplorerTab.tsx
|   |   |   +-- FileList.tsx
|   |   |   +-- FileGrid.tsx
|   |   |   +-- FileRow.tsx
|   |   |   +-- PeekExpand.tsx
|   |   |   +-- HoverTooltip.tsx
|   |   |   +-- ContextMenu.tsx
|   |   |   +-- Breadcrumb.tsx
|   |   |   +-- ColumnHeaders.tsx
|   |   |   +-- BatchRename.tsx
|   |   +-- terminal/
|   |   |   +-- TerminalTab.tsx
|   |   +-- preview/
|   |   |   +-- PreviewPanel.tsx
|   |   |   +-- CodePreview.tsx
|   |   |   +-- ImagePreview.tsx
|   |   |   +-- MarkdownPreview.tsx
|   |   |   +-- VideoPreview.tsx
|   |   |   +-- SvgPreview.tsx
|   |   |   +-- FolderPreview.tsx
|   |   |   +-- QuickPreview.tsx
|   |   +-- settings/
|   |   |   +-- SettingsPanel.tsx
|   |   |   +-- AppearanceSettings.tsx
|   |   |   +-- ExplorerSettings.tsx
|   |   |   +-- TerminalSettings.tsx
|   |   |   +-- KeybindSettings.tsx
|   |   +-- common/
|   |   |   +-- CommandPalette.tsx
|   |   |   +-- StatusBar.tsx
|   |   +-- layout/
|   |       +-- PanelSplitter.tsx
|   |       +-- PanelContainer.tsx
|   +-- stores/
|   |   +-- tabs.ts
|   |   +-- explorer.ts
|   |   +-- settings.ts
|   |   +-- layout.ts
|   |   +-- search.ts
|   |   +-- terminal.ts
|   +-- hooks/
|   |   +-- useFileSystem.ts
|   |   +-- useTerminal.ts
|   |   +-- useHotkeys.ts
|   |   +-- useLayout.ts
|   |   +-- useTheme.ts
|   |   +-- useVirtualScroll.ts
|   |   +-- useContextMenu.ts
|   +-- theme/
|   |   +-- tokens.ts
|   |   +-- themes/
|   |   |   +-- dotfiles-dark.ts
|   |   |   +-- dotfiles-light.ts
|   |   |   +-- high-contrast.ts
|   |   +-- fonts.ts
|   +-- utils/
|       +-- formatters.ts
|       +-- keybindings.ts
|       +-- constants.ts
|
+-- public/
|   +-- fonts/
+-- index.html
+-- package.json
+-- tsconfig.json
+-- vite.config.ts
+-- tailwind.config.ts
+-- PLAN.md
+-- README.md
```

---

## Phase Plan

### Phase 1 — Foundation + Basic Explorer
**Goal:** Working Tauri shell with tab system, functional explorer, and terminal.

- Tauri v2 + Vite + React 19 + TypeScript scaffold
- Cargo.toml: walkdir, notify, serde/serde_json, tokio, portable-pty, natord, dirs
- tauri.conf.json: custom titlebar (decorations: false), window 1280x800, app id
- Tauri v2 capabilities: fs, shell, dialog, clipboard, events
- Rust commands: read_dir (walkdir + natural sort + pagination), stat_file, watch_dir (notify)
- Rust commands: spawn_pty, write_pty, resize_pty, kill_pty (portable-pty)
- Rust commands: load_settings, save_settings (serde JSON to %APPDATA%/.files/)
- Custom Titlebar: drag region, search bar (Ctrl+K trigger), sidebar/preview toggles
- Zustand stores: tabs, explorer, settings, layout
- Tab system: TabBar + TabManager (add, close, reorder, pin, switch)
- ExplorerTab: list view, breadcrumb nav, file selection, click-to-navigate, Ctrl+L path edit
- TerminalTab: xterm.js + @xterm/addon-webgl, PTY event streaming
- Sidebar: Sources (enumerate local drives via Rust), basic file tree
- StatusBar with context info
- Command palette (Ctrl+K) with basic command list
- Keyboard shortcut framework (useHotkeys)
- CSS variable theming foundation (dotfiles-dark tokens)
- Right-click context menu with common operations
- Settings gear icon in titlebar (opens settings panel stub)

### Phase 2 — Explorer Polish
**Goal:** Full-featured file explorer matching the playground mockup.

- Peek system (inline folder expand with animated accent border)
- Hover tooltip (file metadata popup, configurable delay)
- Grid view mode (thumbnail cards, adjustable size)
- Virtual scrolling for list view (Rust-side pagination + useVirtualScroll)
- Sortable column headers (click primary, shift-click secondary)
- Column resize by dragging headers
- Group-by support (collapsible sections with counts)
- File drag/drop (within explorer, between panels, from desktop INTO app)
- Selection: click, shift-range, ctrl-toggle, ctrl+A, invert
- Breadcrumb: clickable segments + Ctrl+L editable path
- Fuzzy file search (Ctrl+P) via Rust fuzzy_find
- Batch rename dialog with preview
- Copy/move with Rust progress events
- Delete to Recycle Bin (Windows Shell API IFileOperation)
- Space bar quick preview overlay

### Phase 3 — Settings & Theming
**Goal:** Complete settings panel, theme engine.

- Settings panel UI (gear icon in titlebar, full modal, left-nav sections)
- Appearance: theme picker (3 built-in), accent color palette, font selectors, scale slider
- Explorer: view/sort/group config, column editor, peek/tooltip toggles, ignored patterns
- Terminal: shell profile manager (PowerShell, cmd, Git Bash, WSL), font, cursor, scrollback
- Keybindings: searchable table, click-to-rebind, conflict detection
- Theme engine: CSS variables injected at runtime from theme config
- Built-in themes: .files Dark (default), .files Light, High Contrast
- All settings apply live (no restart)
- Settings export / import / reset to defaults

### Phase 4 — Multi-Panel Splits
**Goal:** Split panels, resizable everything.

- PanelContainer: recursive split tree renderer
- PanelSplitter: draggable divider (horizontal + vertical)
- Split creation: drag tab to edge zones, Ctrl+Shift+S/D
- Per-panel independent tab bars
- Tab drag between panels
- Close last tab = collapse panel, sibling expands
- Double-click divider = reset 50/50
- Minimum size enforcement per panel
- Layout preset system: save, load, cycle (Ctrl+Shift+L)
- Layout persistence across sessions

### Phase 5 — File Preview
**Goal:** Rich file preview for common types.

- Code preview: shiki syntax highlighting (200+ languages)
- GPC-specific grammar for shiki (custom TextMate grammar)
- Image preview: zoom, pan, fit, actual-size, EXIF metadata display
- SVG preview: rendered view + source code toggle
- Markdown preview: rendered with GFM + tables
- Video/audio preview: native HTML5 player with controls
- Folder preview: stats grid + contents list
- Space bar quick preview (overlay, press Space/Esc to dismiss)
- Preview as toggleable right panel OR independent tab

### Phase 6 — Git Integration
**Goal:** Full Git client in sidebar.

- Rust: git2 crate for local operations (status, stage, unstage, commit, diff, branch)
- GitHub REST API via reqwest: auth (device flow or PAT), list repos, clone
- GitPanel sidebar section: auth status, repo browser, branch selector
- Staged/unstaged file lists with stage/unstage buttons
- Inline diff viewer (add/remove highlighting, hunk headers)
- Commit dialog with message input
- Push/pull/stash actions
- Git status icons on file rows (modified, staged, untracked, conflict)
- Branch + ahead/behind in status bar
- Context menu git actions: stage, diff, discard changes

### Phase 7 — Windows Integration & Release
**Goal:** Replace Windows Explorer, ship installer.

- Rust: register as default file explorer (HKCU registry)
- Folder double-click opens in .files
- "Open in .files" in Windows right-click context menu (registry)
- System tray icon with quick actions
- NSIS installer via tauri build
- Tauri updater plugin (auto-update from GitHub releases)
- Start with Windows option (registry + settings)
- CLI: `dotfiles <path>` to open specific directory
- Performance profiling: startup time, large directory benchmarks
- Memory audit: ensure sub-50MB baseline
- Accessibility: keyboard navigation, focus management
- README + changelog

---

## Rust Dependencies

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "devtools"] }
tauri-plugin-shell = "2"
tauri-plugin-dialog = "2"
tauri-plugin-clipboard-manager = "2"
tauri-plugin-fs = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
walkdir = "2"
notify = "6"
notify-debouncer-full = "0.3"
portable-pty = "0.8"
image = "0.25"
base64 = "0.22"
fuzzy-matcher = "0.3"
git2 = "0.19"
reqwest = { version = "0.12", features = ["json"] }
dirs = "5"
chrono = "0.4"
natord = "1.0"
thiserror = "1"
log = "0.4"
env_logger = "0.11"
```

```json
// Frontend dependencies (package.json)
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-shell": "^2",
    "@tauri-apps/plugin-dialog": "^2",
    "@tauri-apps/plugin-clipboard-manager": "^2",
    "@tauri-apps/plugin-fs": "^2",
    "react": "^19",
    "react-dom": "^19",
    "zustand": "^5",
    "@xterm/xterm": "^5",
    "@xterm/addon-fit": "^0.10",
    "@xterm/addon-webgl": "^0.18",
    "shiki": "^1"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "typescript": "^5.5",
    "vite": "^6",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^4",
    "autoprefixer": "^10"
  }
}
```

---

## Performance Targets

- Sub-200ms startup to interactive
- Under 50MB RAM baseline
- Under 10MB installer bundle
- Handle 100K+ file directories without stutter (Rust pagination + virtual scroll)
- Terminal supports full ANSI escape sequences (xterm.js)
- Settings changes apply live (Rust pushes to frontend via events)
- File watcher debounced (notify crate, no CPU hammering)
- All Rust commands async (tokio runtime)

---

## Design Reference

- Playground mockup: `projects/.files/nexus-playground.html`
- Original mockup JSX: `projects/.files/workspace-mockup.jsx`
- Screenshots: `projects/.files/Screenshot 2026-03-06 23*.png`
- Color tokens: see playground CSS `:root` block (--void through --cyan)
- Fonts: Outfit (UI), JetBrains Mono (code/terminal)
