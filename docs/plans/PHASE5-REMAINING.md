# Phase 5 Remaining Work

**Date:** 2026-03-07
**Context:** Phase 5 preview renderers are done, but several features from HANDOFF.md are missing or broken.

## What's Missing (from screenshots + HANDOFF.md)

### 1. Peek-Expand (Inline Folder Expand)
- Screenshot shows folders with chevron arrows and item counts (e.g., "src 5", "assets 3", "docs 3")
- Clicking chevron expands folder inline showing children indented
- Screenshot 2 shows nested peek: assets expanded showing logo.svg, preview.png, icons folder
- **Status:** ExplorerTab has peekPaths/peekChildren state and PeekRow component, but the chevron + item count display on folder rows needs verification. The peek system may have been disrupted by our changes.

### 2. Sidebar File Tree (EXPLORER section)
- Screenshot shows full tree view in left sidebar under "EXPLORER" heading
- Separate from SOURCES (Local, Google Drive, OneDrive, USB)
- Shows expanded folder tree with file icons (colored by type: .gpc = green, .json = blue, etc.)
- Clicking a file in the sidebar tree should open preview
- **Status:** Current Sidebar.tsx only has Sources list (drives). No file tree.

### 3. Sidebar Sections Missing
- SOURCES section (Local, Google Drive, OneDrive, USB) -- partially exists (drives only)
- EXPLORER section (file tree) -- missing entirely
- TAGS section -- missing
- GIT section -- missing (Phase 6 planned)

### 4. Click-to-Preview in Sidebar
- User says "we used to be able to just click on file in the preview panel opens up"
- Clicking a file in sidebar tree or explorer should populate preview panel
- Need to verify auto-follow works properly

### 5. File Type Icons (Colored)
- Screenshot shows colored icons by file type (.gpc green, .json blue, .svg orange, etc.)
- Current implementation uses generic yellow folder / gray file icons only

### 6. Item Count on Folders
- Folders show child count next to name: "src 5", "assets 3", "docs 3"
- Not currently implemented

### 7. Titlebar Details
- Search bar centered in titlebar with "Search files & commands... Ctrl+K"
- Nexus branding + version (v0.1a) in top-left
- Panel toggle buttons in top-right

### 8. Status Bar
- Shows: "Claude CLI connected" indicator (green dot)
- Shows: "Claude CLI | main (git branch icon) | Explorer | cronus-scripts | 18 items"
- Current StatusBar may be simpler

### 9. Tab Icons
- Explorer tab: folder icon
- PowerShell tab: terminal icon (">_")
- Claude REPL tab: sparkle icon
- Preview tab: eye icon (added)

## Priority Order
1. Fix peek-expand (was working, may be broken)
2. File type colored icons
3. Folder item counts
4. Sidebar file tree (EXPLORER section)
5. Click-to-preview from sidebar
6. Status bar improvements
7. Titlebar search bar styling
