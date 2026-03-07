# Phase 5: File Preview Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade QuickPreview into a full file preview system with shiki syntax highlighting, image zoom/pan, SVG/markdown rendering, video/audio playback, folder stats, a toggleable right panel with auto-follow/pin, and preview tabs.

**Architecture:** One `PreviewRenderer` component dispatches to type-specific renderers (code, image, SVG, markdown, media, folder). Three containers mount it: overlay (Space bar), right panel (Ctrl+Shift+P), and independent tab. A new `usePreviewStore` Zustand store manages panel visibility, pinning, and the active preview entry.

**Tech Stack:** React 19, TypeScript, Zustand, shiki (WASM syntax highlighting), marked (markdown), Tauri v2 asset protocol, Rust walkdir (dir_stats command)

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install shiki and marked**

Run:
```bash
cd /c/Projects/.files && npm install shiki marked
```

**Step 2: Verify installation**

Run:
```bash
cd /c/Projects/.files && node -e "require('shiki'); require('marked'); console.log('OK')"
```
Expected: `OK`

**Step 3: Commit**

```bash
cd /c/Projects/.files && git add package.json package-lock.json && git commit -m "$(cat <<'EOF'
feat: add shiki and marked dependencies for file preview

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add dir_stats Rust Command

**Files:**
- Modify: `src-tauri/src/models/file_entry.rs`
- Modify: `src-tauri/src/commands/filesystem.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add DirStats struct to models**

In `src-tauri/src/models/file_entry.rs`, add after the `DirListing` struct:

```rust
#[derive(Debug, Clone, Serialize)]
pub struct DirStats {
    pub file_count: u64,
    pub dir_count: u64,
    pub total_size: u64,
    pub truncated: bool,
}
```

**Step 2: Add dir_stats command**

In `src-tauri/src/commands/filesystem.rs`, add after `read_text_file`:

```rust
use crate::models::file_entry::DirStats;

#[tauri::command]
pub async fn dir_stats(path: String) -> Result<DirStats, String> {
    let dir_path = std::path::Path::new(&path);
    if !dir_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if !dir_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let mut file_count: u64 = 0;
    let mut dir_count: u64 = 0;
    let mut total_size: u64 = 0;
    let mut truncated = false;
    const MAX_ENTRIES: u64 = 100_000;

    for entry in WalkDir::new(&path).min_depth(1) {
        if file_count + dir_count >= MAX_ENTRIES {
            truncated = true;
            break;
        }
        if let Ok(entry) = entry {
            if let Ok(meta) = entry.metadata() {
                if meta.is_dir() {
                    dir_count += 1;
                } else {
                    file_count += 1;
                    total_size += meta.len();
                }
            }
        }
    }

    Ok(DirStats {
        file_count,
        dir_count,
        total_size,
        truncated,
    })
}
```

**Step 3: Register the command**

In `src-tauri/src/lib.rs`, add `filesystem::dir_stats` to the `invoke_handler` list, after `filesystem::read_text_file`:

```rust
filesystem::dir_stats,
```

**Step 4: Add the DirStats import**

The `DirStats` import in `filesystem.rs` -- add it to the existing use statement at line 1:

```rust
use crate::models::file_entry::{DirListing, DirStats, FileEntry};
```

**Step 5: Verify compilation**

Run:
```bash
cd /c/Projects/.files && cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | tail -5
```
Expected: `Finished` with no errors

**Step 6: Commit**

```bash
cd /c/Projects/.files && git add src-tauri/src/models/file_entry.rs src-tauri/src/commands/filesystem.rs src-tauri/src/lib.rs && git commit -m "$(cat <<'EOF'
feat: add dir_stats Rust command for folder preview

Async recursive walk returning file/dir counts and total size.
Caps at 100K entries to prevent hanging on massive trees.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add TypeScript Types and API

**Files:**
- Modify: `src/types.ts`
- Modify: `src/api/filesystem.ts`

**Step 1: Add DirStats type and update TabType**

In `src/types.ts`, add the `DirStats` interface and update `TabType`:

Change `TabType`:
```ts
export type TabType = 'explorer' | 'terminal' | 'preview';
```

Add after `DirListing`:
```ts
export interface DirStats {
  file_count: number;
  dir_count: number;
  total_size: number;
  truncated: boolean;
}
```

Update `Tab` to include an optional `previewPath`:
```ts
export interface Tab {
  id: string;
  type: TabType;
  title: string;
  path?: string;
  previewPath?: string;
  pinned: boolean;
}
```

**Step 2: Add API functions**

In `src/api/filesystem.ts`, add:

```ts
import type { DirListing, DirStats, FileEntry } from '../types';

export async function readTextFile(path: string, maxBytes: number = 524288): Promise<string> {
  return invoke('read_text_file', { path, maxBytes });
}

export async function dirStats(path: string): Promise<DirStats> {
  return invoke('dir_stats', { path });
}
```

**Step 3: Commit**

```bash
cd /c/Projects/.files && git add src/types.ts src/api/filesystem.ts && git commit -m "$(cat <<'EOF'
feat: add DirStats type, preview TabType, and API functions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create File Type Detection Utility

**Files:**
- Create: `src/utils/fileType.ts`

**Step 1: Create the utility**

```ts
import type { FileEntry } from '../types';

export type FilePreviewType =
  | { kind: 'code'; language: string }
  | { kind: 'image' }
  | { kind: 'svg' }
  | { kind: 'markdown' }
  | { kind: 'video'; mime: string }
  | { kind: 'audio'; mime: string }
  | { kind: 'folder' }
  | { kind: 'unknown' };

const imageExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'ico', 'avif', 'tiff', 'tif']);

const videoExts: Record<string, string> = {
  mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime',
  avi: 'video/x-msvideo', mkv: 'video/x-matroska',
};

const audioExts: Record<string, string> = {
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
  aac: 'audio/aac', m4a: 'audio/mp4', wma: 'audio/x-ms-wma', webm: 'audio/webm',
};

// Maps file extensions to shiki language identifiers
const codeExtMap: Record<string, string> = {
  js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
  py: 'python', rs: 'rust', go: 'go', java: 'java',
  c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp', cs: 'csharp',
  rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
  lua: 'lua', r: 'r', scala: 'scala', dart: 'dart',
  sql: 'sql', graphql: 'graphql', gql: 'graphql',
  html: 'html', css: 'css', scss: 'scss', sass: 'sass', less: 'less',
  json: 'json', jsonc: 'jsonc', yaml: 'yaml', yml: 'yaml',
  toml: 'toml', xml: 'xml', ini: 'ini', cfg: 'ini',
  sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'fish',
  bat: 'bat', ps1: 'powershell', psm1: 'powershell',
  dockerfile: 'dockerfile', makefile: 'makefile',
  vim: 'viml', tex: 'latex', diff: 'diff', patch: 'diff',
  csv: 'csv', tsv: 'csv', log: 'log',
  txt: 'plaintext', text: 'plaintext', env: 'dotenv',
  gitignore: 'gitignore', editorconfig: 'ini',
  gpc: 'c', // GPC uses C-like syntax; custom grammar later
};

export function getFileType(entry: FileEntry): FilePreviewType {
  if (entry.is_dir) return { kind: 'folder' };

  const ext = (entry.extension || '').toLowerCase();
  const nameLower = entry.name.toLowerCase();

  // Check by filename for extensionless files
  if (nameLower === 'dockerfile') return { kind: 'code', language: 'dockerfile' };
  if (nameLower === 'makefile') return { kind: 'code', language: 'makefile' };
  if (nameLower === '.gitignore') return { kind: 'code', language: 'gitignore' };
  if (nameLower === '.env' || nameLower === '.env.local') return { kind: 'code', language: 'dotenv' };

  if (!ext) return { kind: 'unknown' };

  if (ext === 'svg') return { kind: 'svg' };
  if (ext === 'md' || ext === 'mdx' || ext === 'markdown') return { kind: 'markdown' };
  if (imageExts.has(ext)) return { kind: 'image' };
  if (videoExts[ext]) return { kind: 'video', mime: videoExts[ext] };
  if (audioExts[ext]) return { kind: 'audio', mime: audioExts[ext] };

  const lang = codeExtMap[ext];
  if (lang) return { kind: 'code', language: lang };

  return { kind: 'unknown' };
}
```

**Step 2: Commit**

```bash
cd /c/Projects/.files && git add src/utils/fileType.ts && git commit -m "$(cat <<'EOF'
feat: add centralized file type detection utility

Maps extensions to preview types: code (with shiki language ID),
image, svg, markdown, video, audio, folder, unknown.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Create Preview Zustand Store

**Files:**
- Create: `src/stores/preview.ts`

**Step 1: Create the store**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileEntry } from '../types';

interface PreviewState {
  // Panel state
  previewEntry: FileEntry | null;
  pinned: boolean;
  panelVisible: boolean;
  panelWidth: number;

  // Overlay state (ephemeral, not persisted)
  overlayEntry: FileEntry | null;

  // Actions
  setPreviewEntry: (entry: FileEntry | null) => void;
  setPinned: (pinned: boolean) => void;
  togglePinned: () => void;
  togglePanel: () => void;
  showPanel: () => void;
  hidePanel: () => void;
  setPanelWidth: (width: number) => void;
  setOverlayEntry: (entry: FileEntry | null) => void;

  // Auto-follow: only updates if not pinned
  followSelection: (entry: FileEntry | null) => void;
}

export const usePreviewStore = create<PreviewState>()(
  persist(
    (set, get) => ({
      previewEntry: null,
      pinned: false,
      panelVisible: false,
      panelWidth: 350,
      overlayEntry: null,

      setPreviewEntry: (entry) => set({ previewEntry: entry }),
      setPinned: (pinned) => set({ pinned }),
      togglePinned: () => set((s) => ({ pinned: !s.pinned })),
      togglePanel: () => set((s) => ({ panelVisible: !s.panelVisible })),
      showPanel: () => set({ panelVisible: true }),
      hidePanel: () => set({ panelVisible: false }),
      setPanelWidth: (width) => set({ panelWidth: Math.max(250, width) }),
      setOverlayEntry: (entry) => set({ overlayEntry: entry }),

      followSelection: (entry) => {
        const { pinned, panelVisible } = get();
        if (!pinned && panelVisible && entry) {
          set({ previewEntry: entry });
        }
      },
    }),
    {
      name: 'dotfiles-preview',
      partialize: (state) => ({
        panelVisible: state.panelVisible,
        panelWidth: state.panelWidth,
        pinned: state.pinned,
      }),
    },
  ),
);
```

**Step 2: Commit**

```bash
cd /c/Projects/.files && git add src/stores/preview.ts && git commit -m "$(cat <<'EOF'
feat: add preview Zustand store

Manages panel visibility, pinning, auto-follow, and overlay state.
Panel width and visibility persisted across sessions.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Create Shiki Theme Bridge

**Files:**
- Create: `src/theme/shikiTheme.ts`

**Step 1: Create the theme bridge**

```ts
import type { ThemeRegistrationRaw } from 'shiki';

/**
 * Generates a shiki theme from the app's CSS custom properties.
 * This ensures syntax highlighting matches the active app theme.
 */
export function createShikiTheme(): ThemeRegistrationRaw {
  const style = getComputedStyle(document.documentElement);
  const get = (prop: string) => style.getPropertyValue(prop).trim();

  return {
    name: 'dotfiles',
    type: 'dark',
    colors: {
      'editor.background': get('--surface') || '#161A21',
      'editor.foreground': get('--t1') || '#D8DEE9',
      'editorLineNumber.foreground': get('--t3') || '#4C5567',
      'editorLineNumber.activeForeground': get('--t2') || '#8891A0',
      'editor.selectionBackground': get('--active') || '#262C38',
    },
    tokenColors: [
      { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: get('--t3') || '#4C5567', fontStyle: 'italic' } },
      { scope: ['string', 'string.quoted'], settings: { foreground: get('--green') || '#4ADE80' } },
      { scope: ['constant.numeric', 'constant.language'], settings: { foreground: get('--warm') || '#D4A06A' } },
      { scope: ['keyword', 'storage.type', 'storage.modifier'], settings: { foreground: get('--purple') || '#C084FC' } },
      { scope: ['entity.name.function', 'support.function'], settings: { foreground: get('--accent') || '#3B82F6' } },
      { scope: ['entity.name.type', 'support.type', 'entity.name.class'], settings: { foreground: get('--cyan') || '#22D3EE' } },
      { scope: ['variable', 'variable.other'], settings: { foreground: get('--t1') || '#D8DEE9' } },
      { scope: ['entity.name.tag'], settings: { foreground: get('--red') || '#F87171' } },
      { scope: ['entity.other.attribute-name'], settings: { foreground: get('--yellow') || '#FBBF24' } },
      { scope: ['meta.embedded', 'source.groovy.embedded'], settings: { foreground: get('--t1') || '#D8DEE9' } },
      { scope: ['punctuation'], settings: { foreground: get('--t2') || '#8891A0' } },
      { scope: ['constant.other', 'variable.other.constant'], settings: { foreground: get('--warm') || '#D4A06A' } },
      { scope: ['keyword.operator'], settings: { foreground: get('--t2') || '#8891A0' } },
      { scope: ['support.constant', 'constant.character.escape'], settings: { foreground: get('--cyan') || '#22D3EE' } },
    ],
  };
}
```

**Step 2: Commit**

```bash
cd /c/Projects/.files && git add src/theme/shikiTheme.ts && git commit -m "$(cat <<'EOF'
feat: add shiki theme bridge from CSS variables

Generates a TextMate theme from app CSS custom properties so
syntax highlighting matches the active app theme.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Create CodePreview Component

**Files:**
- Create: `src/components/preview/CodePreview.tsx`

**Step 1: Create the component**

```tsx
import { useEffect, useState, useRef } from 'react';
import { readTextFile } from '../../api/filesystem';
import { createShikiTheme } from '../../theme/shikiTheme';

interface Props {
  path: string;
  language: string;
}

let highlighterPromise: ReturnType<typeof import('shiki').then> | null = null;

async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(async ({ createHighlighter }) => {
      const theme = createShikiTheme();
      const highlighter = await createHighlighter({
        themes: [theme],
        langs: [],
      });
      return highlighter;
    });
  }
  return highlighterPromise;
}

export function CodePreview({ path, language }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wordWrap, setWordWrap] = useState(true);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    readTextFile(path, 524288)
      .then(async (content) => {
        if (cancelled) return;
        setRaw(content);
        try {
          const highlighter = await getHighlighter();
          // Load the language if not already loaded
          const loadedLangs = highlighter.getLoadedLanguages();
          let lang = language;
          if (!loadedLangs.includes(language as any)) {
            try {
              await highlighter.loadLanguage(language as any);
            } catch {
              lang = 'plaintext';
              if (!loadedLangs.includes('plaintext')) {
                await highlighter.loadLanguage('plaintext');
              }
            }
          }
          const result = highlighter.codeToHtml(content, {
            lang,
            theme: 'dotfiles',
          });
          if (!cancelled) setHtml(result);
        } catch {
          // Fallback: show raw text if shiki fails
          if (!cancelled) setHtml(null);
        }
      })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [path, language]);

  const handleCopy = () => {
    if (raw) {
      navigator.clipboard.writeText(raw).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--t3)', padding: 16, textAlign: 'center' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--red)', padding: 16 }}>{error}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--raised)', fontSize: 11, color: 'var(--t3)',
      }}>
        <span style={{ textTransform: 'uppercase', fontWeight: 500 }}>{language}</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setWordWrap(!wordWrap)}
          style={{
            background: wordWrap ? 'var(--active)' : 'transparent',
            border: '1px solid var(--border)', borderRadius: 3,
            color: 'var(--t2)', fontSize: 10, padding: '2px 8px', cursor: 'pointer',
          }}
        >
          Wrap
        </button>
        <button
          onClick={handleCopy}
          style={{
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 3,
            color: copied ? 'var(--green)' : 'var(--t2)', fontSize: 10,
            padding: '2px 8px', cursor: 'pointer',
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Code */}
      <div
        ref={containerRef}
        style={{
          flex: 1, overflow: 'auto', padding: 12,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.6,
        }}
      >
        {html ? (
          <div
            dangerouslySetInnerHTML={{ __html: html }}
            style={{
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
              wordBreak: wordWrap ? 'break-all' : 'normal',
            }}
          />
        ) : (
          <pre style={{
            color: 'var(--t1)', margin: 0,
            whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
            wordBreak: wordWrap ? 'break-all' : 'normal',
          }}>
            {raw}
          </pre>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
cd /c/Projects/.files && git add src/components/preview/CodePreview.tsx && git commit -m "$(cat <<'EOF'
feat: add CodePreview component with shiki syntax highlighting

Lazy-loads shiki WASM, auto-loads language grammars on demand,
falls back to plain text. Includes word wrap toggle and copy button.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Create ImagePreview Component

**Files:**
- Create: `src/components/preview/ImagePreview.tsx`

**Step 1: Create the component**

```tsx
import { useState, useRef, useCallback, useEffect } from 'react';

interface Props {
  path: string;
  name: string;
}

export function ImagePreview({ path, name }: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const assetUrl = `https://asset.localhost/${path}`;

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Reset when image changes
  useEffect(() => { resetView(); }, [path, resetView]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left - rect.width / 2;
    const cursorY = e.clientY - rect.top - rect.height / 2;

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(0.1, Math.min(20, zoom * factor));

    // Zoom toward cursor position
    const scale = newZoom / zoom;
    const newPanX = cursorX - scale * (cursorX - pan.x);
    const newPanY = cursorY - scale * (cursorY - pan.y);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--raised)', fontSize: 11, color: 'var(--t3)',
      }}>
        {naturalSize.w > 0 && (
          <span>{naturalSize.w} x {naturalSize.h}</span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => setZoom((z) => Math.max(0.1, z / 1.25))} style={toolBtn}>-</button>
        <span style={{ minWidth: 40, textAlign: 'center', fontSize: 10 }}>{zoomPercent}%</span>
        <button onClick={() => setZoom((z) => Math.min(20, z * 1.25))} style={toolBtn}>+</button>
        <button onClick={resetView} style={toolBtn}>Fit</button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={toolBtn}>1:1</button>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1, overflow: 'hidden', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          cursor: dragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
          // Checkerboard for transparency
          background: `
            var(--deep),
            repeating-conic-gradient(var(--surface) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px
          `,
        }}
      >
        <img
          ref={imgRef}
          src={assetUrl}
          alt={name}
          draggable={false}
          onLoad={(e) => {
            const img = e.target as HTMLImageElement;
            setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          style={{
            maxWidth: zoom === 1 ? '100%' : undefined,
            maxHeight: zoom === 1 ? '100%' : undefined,
            objectFit: 'contain',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: dragging ? 'none' : 'transform 0.1s ease-out',
            imageRendering: zoom > 3 ? 'pixelated' : 'auto',
          }}
        />
      </div>
    </div>
  );
}

const toolBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 3,
  color: 'var(--t2)',
  fontSize: 10,
  padding: '2px 8px',
  cursor: 'pointer',
  lineHeight: 1,
};
```

**Step 2: Commit**

```bash
cd /c/Projects/.files && git add src/components/preview/ImagePreview.tsx && git commit -m "$(cat <<'EOF'
feat: add ImagePreview with zoom, pan, and checkerboard background

Scroll wheel zoom centered on cursor, click-drag pan, fit/1:1 buttons,
checkerboard for transparency, pixelated rendering at high zoom.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Create SvgPreview Component

**Files:**
- Create: `src/components/preview/SvgPreview.tsx`

**Step 1: Create the component**

```tsx
import { useState } from 'react';
import { ImagePreview } from './ImagePreview';
import { CodePreview } from './CodePreview';

interface Props {
  path: string;
  name: string;
}

export function SvgPreview({ path, name }: Props) {
  const [mode, setMode] = useState<'rendered' | 'source'>('rendered');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Mode toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--raised)',
      }}>
        <button
          onClick={() => setMode('rendered')}
          style={{
            ...toggleBtn,
            background: mode === 'rendered' ? 'var(--active)' : 'transparent',
            color: mode === 'rendered' ? 'var(--t1)' : 'var(--t3)',
          }}
        >
          Rendered
        </button>
        <button
          onClick={() => setMode('source')}
          style={{
            ...toggleBtn,
            background: mode === 'source' ? 'var(--active)' : 'transparent',
            color: mode === 'source' ? 'var(--t1)' : 'var(--t3)',
          }}
        >
          Source
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {mode === 'rendered' ? (
          <ImagePreview path={path} name={name} />
        ) : (
          <CodePreview path={path} language="xml" />
        )}
      </div>
    </div>
  );
}

const toggleBtn: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 3,
  fontSize: 10,
  padding: '2px 10px',
  cursor: 'pointer',
};
```

**Step 2: Commit**

```bash
cd /c/Projects/.files && git add src/components/preview/SvgPreview.tsx && git commit -m "$(cat <<'EOF'
feat: add SvgPreview with rendered/source toggle

Rendered mode uses ImagePreview (zoom/pan), source mode uses
CodePreview with XML syntax highlighting.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Create MarkdownPreview Component

**Files:**
- Create: `src/components/preview/MarkdownPreview.tsx`

**Step 1: Create the component**

```tsx
import { useEffect, useState } from 'react';
import { marked } from 'marked';
import { readTextFile } from '../../api/filesystem';

interface Props {
  path: string;
}

// Configure marked for GFM
marked.setOptions({
  gfm: true,
  breaks: true,
});

export function MarkdownPreview({ path }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    readTextFile(path, 524288)
      .then(async (content) => {
        if (cancelled) return;
        const result = await marked.parse(content);
        setHtml(result);
      })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [path]);

  if (loading) {
    return <div style={{ color: 'var(--t3)', padding: 16, textAlign: 'center' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--red)', padding: 16 }}>{error}</div>;
  }

  return (
    <div
      className="markdown-preview"
      style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}
      dangerouslySetInnerHTML={{ __html: html || '' }}
    />
  );
}
```

**Step 2: Add markdown styles to tokens.css**

In `src/theme/tokens.css`, append after the scrollbar styles:

```css
/* Markdown preview */
.markdown-preview {
  color: var(--t1);
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  line-height: 1.7;
}

.markdown-preview h1, .markdown-preview h2, .markdown-preview h3,
.markdown-preview h4, .markdown-preview h5, .markdown-preview h6 {
  color: var(--t1);
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.markdown-preview h1 { font-size: 1.6em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
.markdown-preview h2 { font-size: 1.3em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
.markdown-preview h3 { font-size: 1.1em; }

.markdown-preview p { margin: 0.8em 0; }

.markdown-preview a { color: var(--accent); text-decoration: none; }
.markdown-preview a:hover { text-decoration: underline; }

.markdown-preview code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  background: var(--raised);
  padding: 2px 6px;
  border-radius: 3px;
}

.markdown-preview pre {
  background: var(--raised);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
}

.markdown-preview pre code {
  background: none;
  padding: 0;
}

.markdown-preview blockquote {
  border-left: 3px solid var(--accent);
  padding-left: 12px;
  margin: 0.8em 0;
  color: var(--t2);
}

.markdown-preview table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.8em 0;
}

.markdown-preview th, .markdown-preview td {
  border: 1px solid var(--border);
  padding: 6px 12px;
  text-align: left;
}

.markdown-preview th {
  background: var(--raised);
  font-weight: 500;
}

.markdown-preview ul, .markdown-preview ol {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.markdown-preview li { margin: 0.2em 0; }

.markdown-preview hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 1.5em 0;
}

.markdown-preview img {
  max-width: 100%;
  border-radius: 4px;
}

.markdown-preview input[type="checkbox"] {
  margin-right: 6px;
}

.markdown-preview del {
  color: var(--t3);
}
```

**Step 3: Commit**

```bash
cd /c/Projects/.files && git add src/components/preview/MarkdownPreview.tsx src/theme/tokens.css && git commit -m "$(cat <<'EOF'
feat: add MarkdownPreview with GFM rendering and themed styles

Uses marked for GFM parsing (tables, task lists, strikethrough).
CSS styles match app theme variables.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Create MediaPreview Component

**Files:**
- Create: `src/components/preview/MediaPreview.tsx`

**Step 1: Create the component**

```tsx
interface Props {
  path: string;
  name: string;
  kind: 'video' | 'audio';
  mime: string;
}

export function MediaPreview({ path, name, kind, mime }: Props) {
  const assetUrl = `https://asset.localhost/${path}`;

  if (kind === 'video') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', background: 'var(--deep)', padding: 16,
      }}>
        <video
          controls
          autoPlay={false}
          style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 4 }}
        >
          <source src={assetUrl} type={mime} />
          Video format not supported
        </video>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 16, padding: 24,
    }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polygon points="10,8 16,12 10,16" fill="var(--accent)" stroke="none" />
      </svg>
      <div style={{ color: 'var(--t1)', fontSize: 13, fontWeight: 500 }}>{name}</div>
      <audio controls autoPlay={false} style={{ width: '100%', maxWidth: 400 }}>
        <source src={assetUrl} type={mime} />
        Audio format not supported
      </audio>
    </div>
  );
}
```

**Step 2: Commit**

```bash
cd /c/Projects/.files && git add src/components/preview/MediaPreview.tsx && git commit -m "$(cat <<'EOF'
feat: add MediaPreview for video and audio files

HTML5 video/audio with Tauri asset protocol, native browser controls.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Create FolderPreview Component

**Files:**
- Create: `src/components/preview/FolderPreview.tsx`

**Step 1: Create the component**

```tsx
import { useEffect, useState } from 'react';
import { dirStats } from '../../api/filesystem';
import { readDir } from '../../api/filesystem';
import type { FileEntry, DirStats } from '../../types';

interface Props {
  entry: FileEntry;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

export function FolderPreview({ entry }: Props) {
  const [stats, setStats] = useState<DirStats | null>(null);
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [childrenLoading, setChildrenLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setStatsLoading(true);
    setChildrenLoading(true);

    // Load children (fast)
    readDir(entry.path, true)
      .then((listing) => { if (!cancelled) setChildren(listing.entries); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChildrenLoading(false); });

    // Load stats (potentially slow, async)
    dirStats(entry.path)
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setStatsLoading(false); });

    return () => { cancelled = true; };
  }, [entry.path]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
        padding: 16, borderBottom: '1px solid var(--border)',
      }}>
        <StatCard label="Files" value={statsLoading ? '...' : String(stats?.file_count ?? 0)} />
        <StatCard label="Folders" value={statsLoading ? '...' : String(stats?.dir_count ?? 0)} />
        <StatCard
          label="Total Size"
          value={statsLoading ? '...' : formatSize(stats?.total_size ?? 0)}
          note={stats?.truncated ? '(truncated at 100K items)' : undefined}
        />
      </div>

      {/* Contents list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        <div style={{
          padding: '4px 16px 8px', fontSize: 11, color: 'var(--t3)',
          fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Contents {!childrenLoading && `(${children.length})`}
        </div>
        {childrenLoading && (
          <div style={{ color: 'var(--t3)', padding: '8px 16px', fontSize: 12 }}>Loading...</div>
        )}
        {!childrenLoading && children.map((child) => (
          <div
            key={child.path}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 16px', fontSize: 12, color: 'var(--t2)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {child.is_dir ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--yellow)" stroke="none">
                <path d="M1.5 3a1 1 0 011-1H6l1.5 1.5H13.5a1 1 0 011 1V13a1 1 0 01-1 1h-12a1 1 0 01-1-1V3z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--t3)" strokeWidth="1">
                <path d="M4 1.5h5l3.5 3.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1z" />
              </svg>
            )}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {child.name}
            </span>
            <span style={{ fontSize: 11, color: 'var(--t3)', flexShrink: 0 }}>
              {child.is_dir ? '--' : formatSize(child.size)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{
      background: 'var(--raised)', borderRadius: 6, padding: '10px 14px',
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--t1)' }}>{value}</div>
      {note && <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>{note}</div>}
    </div>
  );
}
```

**Step 2: Commit**

```bash
cd /c/Projects/.files && git add src/components/preview/FolderPreview.tsx && git commit -m "$(cat <<'EOF'
feat: add FolderPreview with stats grid and contents list

Shows file/folder counts, total size (async), and sorted children list.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Create PreviewRenderer Component

**Files:**
- Create: `src/components/preview/PreviewRenderer.tsx`

**Step 1: Create the dispatcher component**

```tsx
import type { FileEntry } from '../../types';
import { getFileType } from '../../utils/fileType';
import { CodePreview } from './CodePreview';
import { ImagePreview } from './ImagePreview';
import { SvgPreview } from './SvgPreview';
import { MarkdownPreview } from './MarkdownPreview';
import { MediaPreview } from './MediaPreview';
import { FolderPreview } from './FolderPreview';

interface Props {
  entry: FileEntry;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

export function PreviewRenderer({ entry }: Props) {
  const fileType = getFileType(entry);

  switch (fileType.kind) {
    case 'code':
      return <CodePreview path={entry.path} language={fileType.language} />;
    case 'image':
      return <ImagePreview path={entry.path} name={entry.name} />;
    case 'svg':
      return <SvgPreview path={entry.path} name={entry.name} />;
    case 'markdown':
      return <MarkdownPreview path={entry.path} />;
    case 'video':
      return <MediaPreview path={entry.path} name={entry.name} kind="video" mime={fileType.mime} />;
    case 'audio':
      return <MediaPreview path={entry.path} name={entry.name} kind="audio" mime={fileType.mime} />;
    case 'folder':
      return <FolderPreview entry={entry} />;
    case 'unknown':
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', gap: 8, color: 'var(--t3)',
        }}>
          <svg width="48" height="48" viewBox="0 0 16 16" fill="none" stroke="var(--t3)" strokeWidth="0.8">
            <path d="M4 1.5h5l3.5 3.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1z" />
          </svg>
          <div style={{ fontSize: 13 }}>
            {(entry.extension || '').toUpperCase() || 'Unknown'} file
          </div>
          <div style={{ fontSize: 11 }}>{formatSize(entry.size)}</div>
          <div style={{ fontSize: 10, marginTop: 4 }}>No preview available</div>
        </div>
      );
  }
}
```

**Step 2: Commit**

```bash
cd /c/Projects/.files && git add src/components/preview/PreviewRenderer.tsx && git commit -m "$(cat <<'EOF'
feat: add PreviewRenderer dispatcher component

Routes file entries to type-specific renderers based on getFileType().

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Rewrite QuickPreview to Use PreviewRenderer

**Files:**
- Modify: `src/components/preview/QuickPreview.tsx`

**Step 1: Rewrite QuickPreview**

Replace the entire contents of `QuickPreview.tsx` with:

```tsx
import { useEffect } from 'react';
import type { FileEntry } from '../../types';
import { PreviewRenderer } from './PreviewRenderer';
import { getFileType } from '../../utils/fileType';
import { usePreviewStore } from '../../stores/preview';
import { usePanelsStore } from '../../stores/panels';

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function getTypeBadge(entry: FileEntry): string {
  const ft = getFileType(entry);
  switch (ft.kind) {
    case 'code': return ft.language.toUpperCase();
    case 'image': return 'IMAGE';
    case 'svg': return 'SVG';
    case 'markdown': return 'MARKDOWN';
    case 'video': return 'VIDEO';
    case 'audio': return 'AUDIO';
    case 'folder': return 'FOLDER';
    default: return (entry.extension || 'FILE').toUpperCase();
  }
}

export function QuickPreview({ entry, onClose }: { entry: FileEntry; onClose: () => void }) {
  const showPanel = usePreviewStore((s) => s.showPanel);
  const setPreviewEntry = usePreviewStore((s) => s.setPreviewEntry);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleOpenInPanel = () => {
    setPreviewEntry(entry);
    showPanel();
    onClose();
  };

  const handleOpenInTab = () => {
    const pid = usePanelsStore.getState().focusedPanelId;
    if (pid) {
      usePanelsStore.getState().addTab(pid, {
        id: crypto.randomUUID(),
        type: 'preview',
        title: entry.name,
        previewPath: entry.path,
        pinned: false,
      });
    }
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 998,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '70%', maxWidth: 900, maxHeight: '80vh',
          background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--raised)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t3)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                background: 'var(--active)', padding: '1px 6px', borderRadius: 3,
                fontSize: 9, fontWeight: 500,
              }}>
                {getTypeBadge(entry)}
              </span>
              {!entry.is_dir && <span>{formatSize(entry.size)}</span>}
            </div>
          </div>
          <button onClick={handleOpenInPanel} style={headerBtn} title="Open in panel">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="2" width="14" height="12" rx="1" />
              <line x1="10" y1="2" x2="10" y2="14" />
            </svg>
          </button>
          <button onClick={handleOpenInTab} style={headerBtn} title="Open in tab">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="3" width="14" height="11" rx="1" />
              <path d="M1 6h14" />
              <path d="M5 3v3" />
            </svg>
          </button>
          <div style={{
            fontSize: 10, color: 'var(--t3)', padding: '2px 8px',
            background: 'var(--surface)', borderRadius: 3,
          }}>
            Space to close
          </div>
        </div>

        {/* Preview content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <PreviewRenderer entry={entry} />
        </div>
      </div>
    </div>
  );
}

const headerBtn: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)',
  borderRadius: 4, padding: '4px 6px', cursor: 'pointer',
  color: 'var(--t2)', display: 'flex', alignItems: 'center',
};
```

**Step 2: Commit**

```bash
cd /c/Projects/.files && git add src/components/preview/QuickPreview.tsx && git commit -m "$(cat <<'EOF'
refactor: rewrite QuickPreview to use PreviewRenderer

Now dispatches to type-specific renderers instead of inline logic.
Added type badge, open-in-panel, and open-in-tab buttons.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Create PreviewPanel (Right Sidebar)

**Files:**
- Create: `src/components/preview/PreviewPanel.tsx`

**Step 1: Create the panel component**

```tsx
import { useRef, useCallback } from 'react';
import { usePreviewStore } from '../../stores/preview';
import { PreviewRenderer } from './PreviewRenderer';
import { getFileType } from '../../utils/fileType';

function getTypeBadge(entry: { extension: string | null; is_dir: boolean }): string {
  const ft = getFileType(entry as any);
  switch (ft.kind) {
    case 'code': return ft.language.toUpperCase();
    case 'image': return 'IMAGE';
    case 'svg': return 'SVG';
    case 'markdown': return 'MARKDOWN';
    case 'video': return 'VIDEO';
    case 'audio': return 'AUDIO';
    case 'folder': return 'FOLDER';
    default: return (entry.extension || 'FILE').toUpperCase();
  }
}

export function PreviewPanel() {
  const previewEntry = usePreviewStore((s) => s.previewEntry);
  const pinned = usePreviewStore((s) => s.pinned);
  const panelWidth = usePreviewStore((s) => s.panelWidth);
  const togglePinned = usePreviewStore((s) => s.togglePinned);
  const hidePanel = usePreviewStore((s) => s.hidePanel);
  const setPanelWidth = usePreviewStore((s) => s.setPanelWidth);

  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = panelWidth;

    const handleMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - ev.clientX; // dragging left increases width
      const maxW = window.innerWidth * 0.5;
      setPanelWidth(Math.min(maxW, startWidth.current + delta));
    };

    const handleUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [panelWidth, setPanelWidth]);

  return (
    <div style={{
      width: panelWidth, minWidth: 250, height: '100%',
      display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid var(--border)',
      background: 'var(--surface)',
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute', left: -3, top: 0, bottom: 0, width: 6,
          cursor: 'col-resize', zIndex: 10,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
        onMouseLeave={(e) => { if (!dragging.current) e.currentTarget.style.background = 'transparent'; }}
      />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--raised)', minHeight: 36, flexShrink: 0,
      }}>
        {previewEntry ? (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 500, color: 'var(--t1)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {previewEntry.name}
              </div>
            </div>
            <span style={{
              background: 'var(--active)', padding: '1px 5px', borderRadius: 3,
              fontSize: 9, fontWeight: 500, color: 'var(--t3)',
            }}>
              {getTypeBadge(previewEntry)}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--t3)' }}>Preview</span>
        )}

        {/* Pin button */}
        <button
          onClick={togglePinned}
          title={pinned ? 'Unpin (auto-follow)' : 'Pin (stay on file)'}
          style={{
            background: pinned ? 'var(--active)' : 'transparent',
            border: '1px solid var(--border)', borderRadius: 3,
            padding: '2px 4px', cursor: 'pointer', color: pinned ? 'var(--accent)' : 'var(--t3)',
            display: 'flex', alignItems: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill={pinned ? 'var(--accent)' : 'none'} stroke="currentColor" strokeWidth="1.5">
            <path d="M9.5 2.5L13.5 6.5L10 10L8 14L2 8L6 6L9.5 2.5Z" />
            <line x1="2" y1="14" x2="5" y2="11" />
          </svg>
        </button>

        {/* Close button */}
        <button
          onClick={hidePanel}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--t3)', cursor: 'pointer', padding: '2px 4px',
            display: 'flex', alignItems: 'center', fontSize: 14,
          }}
        >
          x
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {previewEntry ? (
          <PreviewRenderer entry={previewEntry} />
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--t3)', fontSize: 12,
          }}>
            Select a file to preview
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
cd /c/Projects/.files && git add src/components/preview/PreviewPanel.tsx && git commit -m "$(cat <<'EOF'
feat: add PreviewPanel right sidebar with resize and pin toggle

Resizable left edge (min 250px, max 50%), pin/unpin button,
close button, file type badge. Renders PreviewRenderer.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Wire Up PreviewPanel, Auto-Follow, and Hotkeys

**Files:**
- Modify: `src/components/layout/PanelContent.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/explorer/ExplorerTab.tsx`

**Step 1: Add preview tab type to PanelContent**

In `src/components/layout/PanelContent.tsx`:

Add import at top:
```tsx
import { PreviewRenderer } from '../preview/PreviewRenderer';
```

Add after the terminal tab block (after line 41 `{activeTab?.type === 'terminal' && ...}`):
```tsx
        {activeTab?.type === 'preview' && activeTab.previewPath && (
          <PreviewRenderer
            key={activeTab.id}
            entry={{
              name: activeTab.title,
              path: activeTab.previewPath,
              is_dir: false,
              is_hidden: false,
              is_symlink: false,
              size: 0,
              modified: '',
              created: '',
              extension: activeTab.previewPath.split('.').pop() || null,
              readonly: false,
            }}
          />
        )}
```

**Step 2: Add PreviewPanel to App layout and hotkey**

In `src/App.tsx`:

Add imports:
```tsx
import { PreviewPanel } from './components/preview/PreviewPanel';
import { usePreviewStore } from './stores/preview';
```

Add state selector after line 18:
```tsx
  const previewPanelVisible = usePreviewStore((s) => s.panelVisible);
  const togglePreviewPanel = usePreviewStore((s) => s.togglePanel);
```

Add hotkey to the `hotkeys` array (before the closing `]`):
```tsx
      {
        key: 'p',
        ctrl: true,
        shift: true,
        handler: () => togglePreviewPanel(),
      },
```

Add `togglePreviewPanel` to the useMemo deps array.

In the JSX, add `PreviewPanel` inside the flex row, after `<PanelContainer />`:
```tsx
        {previewPanelVisible && <PreviewPanel />}
```

**Step 3: Add auto-follow to ExplorerTab**

In `src/components/explorer/ExplorerTab.tsx`:

Add import:
```tsx
import { usePreviewStore } from '../../stores/preview';
```

Inside the `ExplorerTab` component, after the existing state declarations (around line 433), add:
```tsx
  const followSelection = usePreviewStore((s) => s.followSelection);
```

Add an effect to follow selection changes (after the Space bar effect, around line 502):
```tsx
  // Auto-follow: update preview panel when selection changes
  useEffect(() => {
    if (selectedPaths.size === 1) {
      const path = [...selectedPaths][0];
      const entry = entries.find((e) => e.path === path);
      if (entry) followSelection(entry);
    }
  }, [selectedPaths, entries, followSelection]);
```

**Step 4: Verify the build compiles**

Run:
```bash
cd /c/Projects/.files && npx tsc --noEmit 2>&1 | head -20
```
Expected: No errors

**Step 5: Commit**

```bash
cd /c/Projects/.files && git add src/components/layout/PanelContent.tsx src/App.tsx src/components/explorer/ExplorerTab.tsx && git commit -m "$(cat <<'EOF'
feat: wire up PreviewPanel, auto-follow, preview tabs, and Ctrl+Shift+P

- PanelContent renders PreviewRenderer for preview tabs
- App.tsx mounts PreviewPanel beside PanelContainer when visible
- ExplorerTab auto-follows selection to preview panel
- Ctrl+Shift+P toggles preview panel

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Add "Preview in Tab" to Context Menu

**Files:**
- Modify: `src/components/explorer/ContextMenu.tsx`

**Step 1: Read current ContextMenu**

Read `src/components/explorer/ContextMenu.tsx` first.

**Step 2: Add Preview in Tab action**

Add a new menu item after the existing items. The ContextMenu needs a new `onPreviewInTab` callback prop. Wire it in ExplorerTab to create a preview tab via `usePanelsStore.addTab()`.

In `ContextMenu.tsx`, add to the `Props` interface:
```tsx
onPreviewInTab?: (entry: FileEntry) => void;
```

Add a menu item (after "Open in Terminal" or similar):
```tsx
{!entry?.is_dir && onPreviewInTab && entry && (
  <MenuItem label="Preview in Tab" onClick={() => onPreviewInTab(entry)} />
)}
```

In `ExplorerTab.tsx`, pass the handler to `<ContextMenu>`:
```tsx
onPreviewInTab={(entry) => {
  if (panelId) {
    panelAddTab(panelId, {
      id: crypto.randomUUID(),
      type: 'preview',
      title: entry.name,
      previewPath: entry.path,
      pinned: false,
    });
  }
}}
```

**Step 3: Commit**

```bash
cd /c/Projects/.files && git add src/components/explorer/ContextMenu.tsx src/components/explorer/ExplorerTab.tsx && git commit -m "$(cat <<'EOF'
feat: add 'Preview in Tab' to context menu

Right-click a file to open it in a dedicated preview tab.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Update ExplorerTab Overlay to Use Preview Store

**Files:**
- Modify: `src/components/explorer/ExplorerTab.tsx`

**Step 1: Migrate overlay state to preview store**

In `ExplorerTab.tsx`, the local `previewEntry` state (line 428) should be replaced with the preview store's `overlayEntry`:

Replace:
```tsx
const [previewEntry, setPreviewEntry] = useState<FileEntry | null>(null);
```

With:
```tsx
const previewEntry = usePreviewStore((s) => s.overlayEntry);
const setPreviewEntry = usePreviewStore((s) => s.setOverlayEntry);
```

This way both the overlay and the auto-follow logic use the same store. The rest of the code (Space bar handler at line 493 and QuickPreview render at line 742) already reference `previewEntry` and `setPreviewEntry`, so they work unchanged.

**Step 2: Commit**

```bash
cd /c/Projects/.files && git add src/components/explorer/ExplorerTab.tsx && git commit -m "$(cat <<'EOF'
refactor: migrate overlay preview state to preview store

Replaces local useState with usePreviewStore.overlayEntry
so overlay and panel share the same store.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 19: Full Build Verification

**Step 1: Rust build**

Run:
```bash
cd /c/Projects/.files && cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | tail -5
```
Expected: `Finished`

**Step 2: TypeScript check**

Run:
```bash
cd /c/Projects/.files && npx tsc --noEmit 2>&1 | head -20
```
Expected: No errors

**Step 3: Vite build**

Run:
```bash
cd /c/Projects/.files && npm run build 2>&1 | tail -10
```
Expected: Build succeeds

**Step 4: Dev server smoke test**

Run:
```bash
cd /c/Projects/.files && npm run tauri dev
```
Manual test:
1. Navigate to a folder with mixed file types
2. Select a `.ts` file -> press Space -> verify syntax-highlighted overlay
3. Click "Open in panel" -> verify right panel appears with preview
4. Click a different file -> verify panel auto-follows
5. Click pin button -> click another file -> verify panel stays on pinned file
6. Right-click a `.md` file -> "Preview in Tab" -> verify markdown renders in tab
7. Press Ctrl+Shift+P -> verify panel toggles
8. Preview an image -> scroll wheel zoom, drag to pan
9. Preview a folder -> verify stats + children list
10. Preview a video/audio file if available

**Step 5: Commit any fixes, then final commit**

```bash
cd /c/Projects/.files && git add -A && git commit -m "$(cat <<'EOF'
feat: Phase 5 File Preview complete

Rich preview system with shiki syntax highlighting, image zoom/pan,
SVG rendered/source toggle, markdown GFM rendering, video/audio
HTML5 players, folder stats + contents. Available as Space-bar
overlay, toggleable right panel (Ctrl+Shift+P) with auto-follow/pin,
and independent preview tabs via context menu.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```
