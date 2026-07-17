# Lessons Learned — .files

## Global keydown handlers must guard against text inputs (2026-07-04)

ExplorerTab registers several `window.addEventListener('keydown', ...)` handlers (shortcuts, instant filter, space quick-preview). Any handler that lacks the `tagName === 'INPUT' || 'TEXTAREA'` guard hijacks keystrokes while the user types in the inline-rename input (or any other inline editor). The space-bar quick-preview handler was missing the guard: pressing space during rename called `preventDefault()` (character never typed) and opened QuickPreview, which stole focus and — because InlineRename cancelled on blur — silently aborted the rename.

**Rule:** every new global key handler starts with the input-target guard. When adding an inline editor, grep for `addEventListener('keydown'` and verify every handler bails on INPUT/TEXTAREA targets.

## Inline rename semantics (2026-07-04)

`InlineRename` (src/components/explorer/InlineRename.tsx) is shared by all views. Contract: Enter commits, Escape cancels, blur commits (Windows Explorer parity), unchanged/empty name = cancel, and a `done` ref guarantees `onDone` fires exactly once (Enter triggers unmount which triggers blur — without the guard onDone double-fires).

## View parity checklist (2026-07-04)

Features wired into the list view (FileRow) are NOT automatically available in FileGrid / TilesView / GalleryView / FlatView / TreemapView — each view renders its own rows. Rename was list-only for months. When adding a per-file interaction, walk every view component and either wire it or consciously skip it (treemap intentionally has no rename).

Related: context-menu "Rename" dispatches a synthetic F2 KeyboardEvent and the F2 handler requires `selectedPaths.size === 1`. Right-click must therefore select the clicked entry (openCtxMenu in ExplorerTab does this, Explorer-style) or ctx-menu actions silently no-op.

## WebView2 fires native clipboard events despite preventDefault (2026-07-09)

Ctrl+V was handled twice: the capture-phase keydown handler calls `preventDefault()` and pastes, but WebView2 STILL dispatches the native `paste` ClipboardEvent, whose document-level listener pasted again. The second paste raced the first and popped a bogus replace-conflict dialog. Fix: 500ms same-action guard (`lastPasteAt` ref) at the top of `handlePasteWithConflicts`. Rule: any shortcut that also has a native event twin (paste/copy/cut) needs a dedup guard — don't assume preventDefault suppresses the native event in WebView2.

## FlatView owns its data (2026-07-04)

FlatView fetches its own recursive listing (`search_with_filters`) keyed on `rootPath` — the tab-level `refresh()` does not touch it. Mutations done outside FlatView (rename, delete) need the `refreshToken` prop bumped (ExplorerTab `fsVersion`) to force a reload.
