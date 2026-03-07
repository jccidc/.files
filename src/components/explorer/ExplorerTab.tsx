import { useEffect, useState, useRef, useCallback } from 'react';
import { useExplorerStore } from '../../stores/explorer';
import { useSettingsStore } from '../../stores/settings';
import { usePanelsStore } from '../../stores/panels';
import { useVirtualScroll } from '../../hooks/useVirtualScroll';
import { watchDir, unwatchDir, onFsChange } from '../../api/watcher';
import { deleteToTrash, renameFile } from '../../api/shell';
import { readDir } from '../../api/filesystem';
import { ContextMenu } from './ContextMenu';
import { FileGrid } from './FileGrid';
import { BatchRename } from './BatchRename';
import { QuickPreview } from '../preview/QuickPreview';
import { usePreviewStore } from '../../stores/preview';
import type { Tab, FileEntry } from '../../types';

const ROW_HEIGHT = 30;

function IconFolderSmall() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--yellow)" stroke="none">
      <path d="M1.5 3a1 1 0 011-1H6l1.5 1.5H13.5a1 1 0 011 1V13a1 1 0 01-1 1h-12a1 1 0 01-1-1V3z" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--t3)" strokeWidth="1.2">
      <path d="M4 1.5h5l3.5 3.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1z" />
      <polyline points="9,1.5 9,5.5 12.5,5.5" fill="none" />
    </svg>
  );
}

function IconChevron({ expanded }: { expanded?: boolean }) {
  return (
    <svg
      width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="var(--t3)" strokeWidth="1.5"
      style={{ transition: 'transform 0.15s', transform: expanded ? 'rotate(90deg)' : 'none' }}
    >
      <polyline points="2,1 6,4 2,7" />
    </svg>
  );
}

function IconSortAsc() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="var(--accent)" stroke="none">
      <polygon points="4,1 7,6 1,6" />
    </svg>
  );
}

function IconSortDesc() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="var(--accent)" stroke="none">
      <polygon points="4,7 7,2 1,2" />
    </svg>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '--';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function formatDate(iso: string): string {
  if (!iso) return '--';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '--';
  }
}

function formatDateFull(iso: string): string {
  if (!iso) return '--';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return '--';
  }
}

// ---- Breadcrumb ----

interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(path);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEditValue(path); }, [path]);
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const segments = path.replace(/\\/g, '/').split('/').filter(Boolean);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { setEditing(false); onNavigate(editValue); }
    else if (e.key === 'Escape') { setEditing(false); setEditValue(path); }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'l') { e.preventDefault(); setEditing(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (editing) {
    return (
      <div style={{ padding: '6px 12px', background: 'var(--deep)', borderBottom: '1px solid var(--border)' }}>
        <input
          ref={inputRef} value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { setEditing(false); setEditValue(path); }}
          style={{
            width: '100%', background: 'var(--surface)', border: '1px solid var(--accent)',
            borderRadius: 4, padding: '4px 8px', color: 'var(--t1)', fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace", outline: 'none',
          }}
        />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2, padding: '6px 12px',
      background: 'var(--deep)', borderBottom: '1px solid var(--border)', fontSize: 12, overflow: 'hidden',
    }}>
      {segments.map((seg, i) => {
        const partial = segments.slice(0, i + 1).join('\\');
        const fullPath = i === 0 ? partial + '\\' : partial;
        return (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {i > 0 && <IconChevron />}
            <span
              onClick={() => onNavigate(fullPath)}
              style={{ cursor: 'pointer', color: 'var(--t2)', padding: '2px 4px', borderRadius: 3 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--t1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; }}
            >
              {seg}
            </span>
          </span>
        );
      })}
    </div>
  );
}

// ---- Hover Tooltip ----

function HoverTooltip({ entry, x, y }: { entry: FileEntry; x: number; y: number }) {
  return (
    <div style={{
      position: 'fixed', left: x + 16, top: y - 8, zIndex: 900,
      background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 6,
      padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      pointerEvents: 'none', maxWidth: 320, fontSize: 11,
    }}>
      <div style={{ fontWeight: 500, color: 'var(--t1)', marginBottom: 4, wordBreak: 'break-all' }}>{entry.name}</div>
      <div style={{ color: 'var(--t3)', lineHeight: 1.6 }}>
        {entry.is_dir ? 'Folder' : `${(entry.extension || '').toUpperCase()} File`}
        {!entry.is_dir && <span> -- {formatSize(entry.size)}</span>}
        <br />
        Modified: {formatDateFull(entry.modified)}
        <br />
        Created: {formatDateFull(entry.created)}
        {entry.readonly && <><br /><span style={{ color: 'var(--yellow)' }}>Read-only</span></>}
        {entry.is_symlink && <><br /><span style={{ color: 'var(--cyan)' }}>Symlink</span></>}
      </div>
    </div>
  );
}

// ---- Inline Rename ----

function InlineRename({ entry, onDone }: { entry: FileEntry; onDone: (newName: string | null) => void }) {
  const [value, setValue] = useState(entry.name);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      const dotIdx = entry.name.lastIndexOf('.');
      ref.current.setSelectionRange(0, dotIdx > 0 ? dotIdx : entry.name.length);
    }
  }, []);

  return (
    <input
      ref={ref} value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onDone(value);
        else if (e.key === 'Escape') onDone(null);
      }}
      onBlur={() => onDone(null)}
      style={{
        background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 3,
        padding: '1px 4px', color: 'var(--t1)', fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace", outline: 'none', width: '100%',
      }}
    />
  );
}

// ---- Peek Row (inline folder expand) ----

function PeekRow({ entry, depth, onNavigate }: { entry: FileEntry; depth: number; onNavigate: (path: string) => void }) {
  return (
    <div
      onDoubleClick={() => { if (entry.is_dir) onNavigate(entry.path); }}
      style={{
        display: 'grid', gridTemplateColumns: '1fr 100px 140px', alignItems: 'center',
        height: ROW_HEIGHT, cursor: 'pointer', borderRadius: 2,
        background: 'transparent',
        borderLeft: '2px solid var(--accent)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', paddingLeft: 12 + depth * 20, overflow: 'hidden' }}>
        {entry.is_dir ? <IconFolderSmall /> : <IconFile />}
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: entry.is_hidden ? 'var(--t3)' : 'var(--t2)', fontSize: 12,
        }}>
          {entry.name}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--t3)', padding: '0 12px' }}>
        {entry.is_dir ? '--' : formatSize(entry.size)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--t3)', padding: '0 12px' }}>
        {formatDate(entry.modified)}
      </div>
    </div>
  );
}

// ---- FileRow ----

interface FileRowProps {
  entry: FileEntry;
  selected: boolean;
  even: boolean;
  renaming: boolean;
  peekOpen: boolean;
  peekEnabled: boolean;
  colWidths: string;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onRenameDone: (newName: string | null) => void;
  onHover: (entry: FileEntry, x: number, y: number) => void;
  onHoverEnd: () => void;
  onPeekToggle: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

function FileRow({ entry, selected, even, renaming, peekOpen, peekEnabled, colWidths, onClick, onDoubleClick, onContextMenu, onRenameDone, onHover, onHoverEnd, onPeekToggle, onDragStart }: FileRowProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = 'var(--hover)';
        onHover(entry, e.clientX, e.clientY);
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = even ? 'transparent' : 'rgba(255,255,255,0.01)';
        onHoverEnd();
      }}
      onMouseMove={(e) => onHover(entry, e.clientX, e.clientY)}
      style={{
        display: 'grid', gridTemplateColumns: colWidths, alignItems: 'center',
        height: ROW_HEIGHT, background: selected ? 'var(--active)' : even ? 'transparent' : 'rgba(255,255,255,0.01)',
        cursor: 'pointer', borderRadius: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', overflow: 'hidden' }}>
        {entry.is_dir && peekEnabled && (
          <span
            onClick={(e) => { e.stopPropagation(); onPeekToggle(); }}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            <IconChevron expanded={peekOpen} />
          </span>
        )}
        {entry.is_dir ? <IconFolderSmall /> : <IconFile />}
        {renaming ? (
          <InlineRename entry={entry} onDone={onRenameDone} />
        ) : (
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: entry.is_hidden ? 'var(--t3)' : 'var(--t1)', fontSize: 12,
          }}>
            {entry.name}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--t3)', padding: '0 12px' }}>
        {entry.is_dir ? '--' : formatSize(entry.size)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--t3)', padding: '0 12px' }}>
        {formatDate(entry.modified)}
      </div>
    </div>
  );
}

// ---- Sort types ----

type SortField = 'name' | 'size' | 'modified';

function sortEntries(entries: FileEntry[], field: SortField, asc: boolean): FileEntry[] {
  const sorted = [...entries];
  sorted.sort((a, b) => {
    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
    let cmp = 0;
    switch (field) {
      case 'name':
        cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        break;
      case 'size':
        cmp = a.size - b.size;
        break;
      case 'modified':
        cmp = a.modified.localeCompare(b.modified);
        break;
    }
    return asc ? cmp : -cmp;
  });
  return sorted;
}

// ---- Context Menu State ----

interface ContextMenuState {
  x: number;
  y: number;
  entry: FileEntry | null;
}

// ---- Column Resize Handle ----

function ColResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const dragging = useRef(false);
  const startX = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    startX.current = e.clientX;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = ev.clientX - startX.current;
      startX.current = ev.clientX;
      onResize(delta);
    };

    const handleMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 5,
        cursor: 'col-resize', zIndex: 10,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
      onMouseLeave={(e) => { if (!dragging.current) e.currentTarget.style.background = 'transparent'; }}
    />
  );
}

// ---- Main Component ----

export function ExplorerTab({ tab, panelId }: { tab: Tab; panelId?: string }) {
  const { currentPath, entries, selectedPaths, loading, error, viewMode, navigate, refresh, setSelected, toggleSelected, clearSelection } =
    useExplorerStore();
  const showTooltips = useSettingsStore((s) => s.settings.show_tooltips);
  const tooltipDelay = useSettingsStore((s) => s.settings.tooltip_delay);
  const peekEnabled = useSettingsStore((s) => s.settings.peek_enabled);
  const showHidden = useSettingsStore((s) => s.settings.show_hidden);
  const [batchRenameOpen, setBatchRenameOpen] = useState(false);
  const { updateTab: panelUpdateTab, addTab: panelAddTab } = usePanelsStore();
  const followSelection = usePreviewStore((s) => s.followSelection);

  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [tooltip, setTooltip] = useState<{ entry: FileEntry; x: number; y: number } | null>(null);
  const [previewEntry, setPreviewEntry] = useState<FileEntry | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [peekPaths, setPeekPaths] = useState<Set<string>>(new Set());
  const [peekChildren, setPeekChildren] = useState<Record<string, FileEntry[]>>({});
  const [dropHighlight, setDropHighlight] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastClickedIndex = useRef<number>(-1);
  const watcherIdRef = useRef(tab.id);

  // Column widths: [name(flex), size(px), modified(px)]
  const [sizeColW, setSizeColW] = useState(100);
  const [modColW, setModColW] = useState(140);

  const colWidths = `1fr ${sizeColW}px ${modColW}px`;

  const sortedEntries = sortEntries(entries, sortField, sortAsc);

  // Build flat list with peek children for virtual scroll
  const flatList: { entry: FileEntry; depth: number; isPeek: boolean }[] = [];
  for (const entry of sortedEntries) {
    flatList.push({ entry, depth: 0, isPeek: false });
    if (peekPaths.has(entry.path) && peekChildren[entry.path]) {
      for (const child of peekChildren[entry.path]) {
        flatList.push({ entry: child, depth: 1, isPeek: true });
      }
    }
  }

  // Virtual scroll
  const { startIndex, endIndex, totalHeight, offsetY, containerRef, onScroll } =
    useVirtualScroll(flatList.length, ROW_HEIGHT, 8);

  // Navigate on mount
  useEffect(() => {
    if (tab.path && tab.path !== currentPath) {
      navigate(tab.path);
    } else if (!entries.length && !loading && !error) {
      navigate(currentPath);
    }
  }, []);

  // Update tab title
  useEffect(() => {
    const segments = currentPath.replace(/\\/g, '/').split('/').filter(Boolean);
    const folderName = segments[segments.length - 1] || currentPath;
    if (panelId) {
      panelUpdateTab(panelId, tab.id, { title: folderName, path: currentPath });
    }
  }, [currentPath]);

  // File watcher
  useEffect(() => {
    const id = watcherIdRef.current;
    let unlisten: (() => void) | undefined;
    watchDir(id, currentPath).catch(() => {});
    onFsChange(id, () => refresh()).then((fn) => { unlisten = fn; });
    return () => {
      unwatchDir(id).catch(() => {});
      if (unlisten) unlisten();
    };
  }, [currentPath]);

  // Space bar quick preview
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' && !previewEntry && selectedPaths.size === 1) {
        e.preventDefault();
        const path = [...selectedPaths][0];
        const entry = entries.find((en) => en.path === path);
        if (entry) setPreviewEntry(entry);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedPaths, entries, previewEntry]);

  // Auto-follow: update preview panel when selection changes
  useEffect(() => {
    if (selectedPaths.size === 1) {
      const path = [...selectedPaths][0];
      const entry = entries.find((e) => e.path === path);
      if (entry) followSelection(entry);
    }
  }, [selectedPaths, entries, followSelection]);

  // Delete key + F2
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedPaths.size > 0) {
        e.preventDefault();
        const paths = [...selectedPaths];
        deleteToTrash(paths).then(() => refresh()).catch(() => {});
      }
      if (e.key === 'F2' && selectedPaths.size === 1) {
        e.preventDefault();
        setRenamingPath([...selectedPaths][0]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedPaths]);

  // Click handler with shift-range and ctrl-toggle
  const handleRowClick = useCallback(
    (entry: FileEntry, index: number, e: React.MouseEvent) => {
      if (e.shiftKey && lastClickedIndex.current >= 0) {
        const start = Math.min(lastClickedIndex.current, index);
        const end = Math.max(lastClickedIndex.current, index);
        const range = new Set(sortedEntries.slice(start, end + 1).map((en) => en.path));
        if (e.ctrlKey) {
          const merged = new Set(selectedPaths);
          range.forEach((p) => merged.add(p));
          setSelected(merged);
        } else {
          setSelected(range);
        }
      } else if (e.ctrlKey) {
        toggleSelected(entry.path);
        lastClickedIndex.current = index;
      } else {
        clearSelection();
        toggleSelected(entry.path);
        lastClickedIndex.current = index;
      }
    },
    [sortedEntries, selectedPaths, setSelected, toggleSelected, clearSelection],
  );

  const handleDoubleClick = (entry: FileEntry) => {
    if (entry.is_dir) navigate(entry.path);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const handleHover = (entry: FileEntry, x: number, y: number) => {
    if (!showTooltips) return;
    clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setTooltip({ entry, x, y }), tooltipDelay);
  };

  const handleHoverEnd = () => {
    clearTimeout(tooltipTimer.current);
    setTooltip(null);
  };

  const handleRenameDone = async (newName: string | null) => {
    if (newName && renamingPath) {
      await renameFile(renamingPath, newName).catch(() => {});
      await refresh();
    }
    setRenamingPath(null);
  };

  const handleDragStart = (e: React.DragEvent, entry: FileEntry) => {
    e.dataTransfer.setData('text/plain', entry.path);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropHighlight(false);

    // Check for external files from desktop
    if (e.dataTransfer.files?.length > 0) {
      // Tauri handles external file drops via its own event system
      // For files dragged from within the app:
      return;
    }

    const droppedPath = e.dataTransfer.getData('text/plain');
    if (droppedPath && droppedPath !== currentPath) {
      const { moveFiles } = await import('../../api/shell');
      await moveFiles([droppedPath], currentPath).catch(() => {});
      refresh();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropHighlight(true);
  };

  const handleDragLeave = () => {
    setDropHighlight(false);
  };

  const handlePeekToggle = async (entry: FileEntry) => {
    const next = new Set(peekPaths);
    if (next.has(entry.path)) {
      next.delete(entry.path);
    } else {
      next.add(entry.path);
      if (!peekChildren[entry.path]) {
        try {
          const listing = await readDir(entry.path, showHidden);
          setPeekChildren((prev) => ({ ...prev, [entry.path]: listing.entries.slice(0, 20) }));
        } catch {}
      }
    }
    setPeekPaths(next);
  };

  const handleCopyPath = (path: string) => navigator.clipboard.writeText(path).catch(() => {});
  const handleNewTerminal = (cwd: string) => {
    if (panelId) {
      panelAddTab(panelId, { id: crypto.randomUUID(), type: 'terminal', title: 'Terminal', path: cwd, pinned: false });
    }
  };

  const colHeaderStyle = (field: SortField): React.CSSProperties => ({
    padding: '6px 12px', fontSize: 11, fontWeight: 500, color: sortField === field ? 'var(--accent)' : 'var(--t3)',
    textAlign: 'left', cursor: 'pointer', userSelect: 'none',
    display: 'flex', alignItems: 'center', gap: 4, position: 'relative',
  });

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
        outline: dropHighlight ? '2px solid var(--accent)' : 'none',
        outlineOffset: -2,
      }}
      onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, entry: null }); }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Breadcrumb path={currentPath} onNavigate={navigate} />

      {/* Column headers with resize handles */}
      <div style={{
        display: 'grid', gridTemplateColumns: colWidths,
        borderBottom: '1px solid var(--border)', background: 'var(--base)',
      }}>
        <div style={colHeaderStyle('name')} onClick={() => handleSort('name')}>
          Name {sortField === 'name' && (sortAsc ? <IconSortAsc /> : <IconSortDesc />)}
          <ColResizeHandle onResize={(d) => {
            // When resizing the name column right edge, shrink/grow size col
            setSizeColW((w) => Math.max(60, w - d));
          }} />
        </div>
        <div style={colHeaderStyle('size')} onClick={() => handleSort('size')}>
          Size {sortField === 'size' && (sortAsc ? <IconSortAsc /> : <IconSortDesc />)}
          <ColResizeHandle onResize={(d) => {
            setSizeColW((w) => Math.max(60, w + d));
            setModColW((w) => Math.max(80, w - d));
          }} />
        </div>
        <div style={colHeaderStyle('modified')} onClick={() => handleSort('modified')}>
          Modified {sortField === 'modified' && (sortAsc ? <IconSortAsc /> : <IconSortDesc />)}
        </div>
      </div>

      {/* File list with virtual scroll */}
      {loading && <div style={{ padding: 24, color: 'var(--t3)', textAlign: 'center', flex: 1 }}>Loading...</div>}
      {error && <div style={{ padding: 24, color: 'var(--red)', textAlign: 'center', flex: 1 }}>{error}</div>}
      {!loading && !error && viewMode === 'list' && (
        <div
          ref={containerRef}
          onScroll={onScroll}
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
        >
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
              {flatList.slice(startIndex, endIndex).map((item, i) => {
                const globalIdx = startIndex + i;
                if (item.isPeek) {
                  return (
                    <PeekRow
                      key={`peek-${item.entry.path}`}
                      entry={item.entry}
                      depth={item.depth}
                      onNavigate={navigate}
                    />
                  );
                }
                return (
                  <FileRow
                    key={item.entry.path}
                    entry={item.entry}
                    selected={selectedPaths.has(item.entry.path)}
                    even={globalIdx % 2 === 0}
                    renaming={renamingPath === item.entry.path}
                    peekOpen={peekPaths.has(item.entry.path)}
                    peekEnabled={peekEnabled && item.entry.is_dir}
                    colWidths={colWidths}
                    onClick={(e) => handleRowClick(item.entry, globalIdx, e)}
                    onDoubleClick={() => handleDoubleClick(item.entry)}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, entry: item.entry }); }}
                    onRenameDone={handleRenameDone}
                    onHover={handleHover}
                    onHoverEnd={handleHoverEnd}
                    onPeekToggle={() => handlePeekToggle(item.entry)}
                    onDragStart={(e) => handleDragStart(e, item.entry)}
                  />
                );
              })}
            </div>
          </div>
          {entries.length === 0 && (
            <div style={{ padding: 24, color: 'var(--t3)', textAlign: 'center' }}>Empty directory</div>
          )}
        </div>
      )}
      {!loading && !error && viewMode === 'grid' && (
        <FileGrid
          entries={sortedEntries}
          selectedPaths={selectedPaths}
          onRowClick={handleRowClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={(e, entry) => { setCtxMenu({ x: e.clientX, y: e.clientY, entry }); }}
          onDragStart={handleDragStart}
        />
      )}

      {/* Tooltip */}
      {tooltip && <HoverTooltip entry={tooltip.entry} x={tooltip.x} y={tooltip.y} />}

      {/* Quick Preview */}
      {previewEntry && <QuickPreview entry={previewEntry} onClose={() => setPreviewEntry(null)} />}

      {/* Batch Rename */}
      {batchRenameOpen && (
        <BatchRename
          entries={entries.filter((e) => selectedPaths.has(e.path))}
          onClose={() => setBatchRenameOpen(false)}
          onDone={() => { setBatchRenameOpen(false); refresh(); }}
        />
      )}

      {/* Context Menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x} y={ctxMenu.y} entry={ctxMenu.entry}
          onClose={() => setCtxMenu(null)}
          onOpen={(entry) => { if (entry.is_dir) navigate(entry.path); }}
          onCopyPath={handleCopyPath}
          onRefresh={refresh}
          onNewTerminal={handleNewTerminal}
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
        />
      )}
    </div>
  );
}
