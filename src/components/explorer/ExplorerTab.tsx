import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useExplorerStore } from '../../stores/explorer';
import { useSettingsStore } from '../../stores/settings';
import { usePanelsStore } from '../../stores/panels';
import { watchDir, unwatchDir, onFsChange } from '../../api/watcher';
import { deleteToTrash, renameFile, resolveShortcut, openFile } from '../../api/shell';
import { readDir } from '../../api/filesystem';
import { ContextMenu } from './ContextMenu';
import { FileGrid } from './FileGrid';
import { BatchRename } from './BatchRename';
import { Toolbar, type GroupBy } from './Toolbar';
import { QuickPreview } from '../preview/QuickPreview';
import { usePreviewStore } from '../../stores/preview';
import { FileIcon } from '../common/FileIcon';
import { useGitStore } from '../../stores/git';
import type { Tab, FileEntry } from '../../types';


/** Strip .lnk extension for cleaner display */
function displayName(entry: FileEntry): string {
  if ((entry.extension || '').toLowerCase() === 'lnk') {
    return entry.name.replace(/\.lnk$/i, '');
  }
  return entry.name;
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

// ---- Hover Tooltip ----

function HoverTooltip({ entry, x, y }: { entry: FileEntry; x: number; y: number }) {
  return (
    <div style={{
      position: 'fixed', left: x + 16, top: y - 8, zIndex: 900,
      background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 6,
      padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      pointerEvents: 'none', maxWidth: 320, fontSize: 11,
    }}>
      <div style={{ fontWeight: 500, color: 'var(--t1)', marginBottom: 4, wordBreak: 'break-all' }}>{displayName(entry)}</div>
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
        fontFamily: "'JetBrains Mono', monospace", outline: 'none',
        flex: 1, minWidth: 0, height: 22, boxSizing: 'border-box',
      }}
    />
  );
}

// ---- Peek Row (inline folder expand) ----

// ---- Column Cell Renderer ----

const cellStyle: React.CSSProperties = { fontSize: 'var(--file-font-size-sm)', color: 'var(--t3)', padding: '0 var(--density-pad-x)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

function CellValue({ col, entry, gitStatus }: { col: ColumnId; entry: FileEntry; gitStatus?: string }) {
  switch (col) {
    case 'size':
      return <div style={cellStyle}>{entry.is_dir ? '--' : formatSize(entry.size)}</div>;
    case 'modified':
      return <div style={cellStyle}>{formatDate(entry.modified)}</div>;
    case 'created':
      return <div style={cellStyle}>{formatDate(entry.created)}</div>;
    case 'type':
      return <div style={cellStyle}>{entry.is_dir ? 'Folder' : (entry.extension ? `.${entry.extension}` : '--')}</div>;
    case 'status': {
      const gs = gitStatus;
      if (!gs) return <div style={cellStyle}>--</div>;
      return (
        <div style={{ ...cellStyle, color: gitStatusColors[gs] || 'var(--t3)', fontWeight: 600 }}>
          {gitStatusLetters[gs] || ''} {gs}
        </div>
      );
    }
    default:
      return null;
  }
}

function PeekRow({ entry, selected, colWidths, columns, onClick, onDoubleClick }: {
  entry: FileEntry; selected: boolean; colWidths: string; columns: ColumnDef[];
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        display: 'grid', gridTemplateColumns: colWidths, alignItems: 'center',
        height: 'var(--row-height)', cursor: 'pointer', borderRadius: 2,
        background: selected ? 'var(--active)' : 'transparent',
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--hover)'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = selected ? 'var(--active)' : 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--density-gap)', padding: '0 var(--density-pad-x)', paddingLeft: 28, overflow: 'hidden' }}>
        <FileIcon entry={entry} />
        <span style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: entry.is_hidden ? 'var(--t3)' : 'var(--t2)', fontSize: 'var(--file-font-size)',
        }}>
          {displayName(entry)}
        </span>
      </div>
      {columns.filter(c => c.id !== 'name').map(c => (
        <CellValue key={c.id} col={c.id} entry={entry} />
      ))}
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
  columns: ColumnDef[];
  gitStatus?: string;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onRenameDone: (newName: string | null) => void;
  onHover: (entry: FileEntry, x: number, y: number) => void;
  onHoverEnd: () => void;
  onPeekToggle: () => void;
  onDragStart: (e: React.DragEvent) => void;
}

const gitStatusColors: Record<string, string> = {
  modified: 'var(--yellow)', added: 'var(--green)', deleted: 'var(--red)',
  renamed: 'var(--cyan)', untracked: 'var(--t3)', conflict: 'var(--red)', typechange: 'var(--purple)',
};
const gitStatusLetters: Record<string, string> = {
  modified: 'M', added: 'A', deleted: 'D', renamed: 'R', untracked: '?', conflict: '!', typechange: 'T',
};

function FileRow({ entry, selected, even, renaming, peekOpen, peekEnabled, colWidths, columns, gitStatus: gs, onClick, onDoubleClick, onContextMenu, onRenameDone, onHover, onHoverEnd, onPeekToggle, onDragStart }: FileRowProps) {
  return (
    <div
      draggable={selected}
      onDragStart={selected ? onDragStart : undefined}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => { if (e.button === 2) { e.preventDefault(); e.stopPropagation(); onContextMenu(e); } }}
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
        height: 'var(--row-height)', background: selected ? 'var(--active)' : even ? 'transparent' : 'rgba(255,255,255,0.01)',
        cursor: 'pointer', borderRadius: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--density-gap)', padding: '0 var(--density-pad-x)', overflow: 'hidden' }}>
        {entry.is_dir && peekEnabled && (
          <span
            onClick={(e) => { e.stopPropagation(); onPeekToggle(); }}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 20, height: 20, margin: '-4px 0 -4px -4px', borderRadius: 3 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <IconChevron expanded={peekOpen} />
          </span>
        )}
        <FileIcon entry={entry} />
        {renaming ? (
          <InlineRename entry={entry} onDone={onRenameDone} />
        ) : (
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: entry.is_hidden ? 'var(--t3)' : 'var(--t1)', fontSize: 'var(--file-font-size)',
          }}>
            {displayName(entry)}
            {entry.is_dir && entry.children_count != null && (
              <span style={{ color: 'var(--t3)', fontSize: 'var(--file-font-size-sm)', marginLeft: 6 }}>
                {entry.children_count}
              </span>
            )}
          </span>
        )}
      </div>
      {columns.filter(c => c.id !== 'name').map(c => (
        <CellValue key={c.id} col={c.id} entry={entry} gitStatus={gs} />
      ))}
    </div>
  );
}

// ---- Sort types ----

type SortField = 'name' | 'size' | 'modified' | 'created' | 'type';

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
      case 'created':
        cmp = (a.created || '').localeCompare(b.created || '');
        break;
      case 'type':
        cmp = (a.extension || '').localeCompare(b.extension || '');
        break;
    }
    return asc ? cmp : -cmp;
  });
  return sorted;
}

// ---- Column definitions ----

type ColumnId = 'name' | 'size' | 'modified' | 'created' | 'type' | 'status';

interface ColumnDef {
  id: ColumnId;
  label: string;
  sortField?: SortField;
  defaultWidth: number; // px, 0 = 1fr
  minWidth: number;
  removable: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { id: 'name',     label: 'Name',     sortField: 'name',     defaultWidth: 0, minWidth: 120, removable: false },
  { id: 'size',     label: 'Size',     sortField: 'size',     defaultWidth: 100, minWidth: 60, removable: true },
  { id: 'modified', label: 'Modified', sortField: 'modified', defaultWidth: 140, minWidth: 80, removable: true },
  { id: 'created',  label: 'Created',  sortField: 'created',  defaultWidth: 140, minWidth: 80, removable: true },
  { id: 'type',     label: 'Type',     sortField: 'type',     defaultWidth: 80,  minWidth: 50, removable: true },
  { id: 'status',   label: 'Status',   sortField: undefined,  defaultWidth: 70,  minWidth: 50, removable: true },
];

const DEFAULT_VISIBLE: ColumnId[] = ['name', 'size', 'modified'];

// ---- Column Chooser Menu (right-click on header) ----

function ColumnChooserMenu({ x, y, visibleCols, onToggle, onClose }: {
  x: number; y: number;
  visibleCols: ColumnId[];
  onToggle: (id: ColumnId) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    requestAnimationFrame(() => document.addEventListener('mousedown', handle));
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  return createPortal(
    <div ref={ref} style={{
      position: 'fixed', left: x, top: y, zIndex: 10000,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '4px 0', minWidth: 160,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      <div style={{ padding: '4px 12px 6px', fontSize: 'var(--file-font-size-sm)', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Columns
      </div>
      {ALL_COLUMNS.map(col => {
        const checked = visibleCols.includes(col.id);
        return (
          <div
            key={col.id}
            onClick={() => col.removable && onToggle(col.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', cursor: col.removable ? 'pointer' : 'default',
              fontSize: 'var(--file-font-size)', color: col.removable ? 'var(--t1)' : 'var(--t3)',
            }}
            onMouseEnter={(e) => { if (col.removable) e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ width: 16, textAlign: 'center', fontSize: 'var(--file-font-size-sm)', color: checked ? 'var(--accent)' : 'var(--t3)' }}>
              {checked ? '\u2713' : ''}
            </span>
            {col.label}
          </div>
        );
      })}
    </div>,
    document.body,
  );
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
  const tabId = tab.id;
  const store = useExplorerStore;

  // Initialize tab state
  useEffect(() => {
    store.getState().initTab(tabId, tab.path);
  }, [tabId]);

  // Mark as active when this tab is visible (focused)
  useEffect(() => {
    store.getState().setActiveTab(tabId);
  }, [tabId]);

  // Per-tab state selectors
  const tabState = store((s) => s.tabStates[tabId]);
  const currentPath = tabState?.currentPath ?? 'C:\\';
  const entries = tabState?.entries ?? [];
  const selectedPaths = tabState?.selectedPaths ?? new Set<string>();
  const loading = tabState?.loading ?? false;
  const error = tabState?.error ?? null;
  const viewMode = tabState?.viewMode ?? 'list';

  // Per-tab actions (bound to tabId)
  const navigate = useCallback((path: string) => store.getState().navigate(tabId, path), [tabId]);
  const refresh = useCallback(() => store.getState().refresh(tabId), [tabId]);
  const setSelected = useCallback((paths: Set<string>) => store.getState().setSelected(tabId, paths), [tabId]);
  const toggleSelected = useCallback((path: string) => store.getState().toggleSelected(tabId, path), [tabId]);
  const clearSelection = useCallback(() => store.getState().clearSelection(tabId), [tabId]);

  const showTooltips = useSettingsStore((s) => s.settings.show_tooltips);
  const tooltipDelay = useSettingsStore((s) => s.settings.tooltip_delay);
  const peekEnabled = useSettingsStore((s) => s.settings.peek_enabled);
  const showHidden = useSettingsStore((s) => s.settings.show_hidden);
  const [batchRenameOpen, setBatchRenameOpen] = useState(false);
  const { updateTab: panelUpdateTab, addTab: panelAddTab } = usePanelsStore();
  const followSelection = usePreviewStore((s) => s.followSelection);
  const pinnedPaths = useSettingsStore((s) => s.settings.pinned_paths);
  const updateSettings = useSettingsStore((s) => s.update);
  const gitFiles = useGitStore((s) => s.files);
  const gitRepoInfo = useGitStore((s) => s.repoInfo);

  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [tooltip, setTooltip] = useState<{ entry: FileEntry; x: number; y: number } | null>(null);
  const previewEntry = usePreviewStore((s) => s.overlayEntry);
  const setPreviewEntry = usePreviewStore((s) => s.setOverlayEntry);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [peekPaths, setPeekPaths] = useState<Set<string>>(new Set());
  const [peekChildren, setPeekChildren] = useState<Record<string, FileEntry[]>>({});
  const [dropHighlight, setDropHighlight] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastClickedIndex = useRef<number>(-1);
  const slowClickTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const slowClickPath = useRef<string | null>(null);
  const watcherIdRef = useRef(tab.id);

  // Column system
  const [visibleCols, setVisibleCols] = useState<ColumnId[]>(DEFAULT_VISIBLE);
  const [colWidthOverrides, setColWidthOverrides] = useState<Record<string, number>>({});
  const [headerCtxMenu, setHeaderCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const activeColumns = visibleCols.map(id => ALL_COLUMNS.find(c => c.id === id)!);

  const getColWidth = (col: ColumnDef) => colWidthOverrides[col.id] ?? col.defaultWidth;

  const colWidths = activeColumns.map(c => c.defaultWidth === 0 ? '1fr' : `${getColWidth(c)}px`).join(' ');

  const resizeColumn = (colId: ColumnId, delta: number) => {
    const col = ALL_COLUMNS.find(c => c.id === colId)!;
    setColWidthOverrides(prev => ({
      ...prev,
      [colId]: Math.max(col.minWidth, (prev[colId] ?? col.defaultWidth) + delta),
    }));
  };

  const toggleColumn = (colId: ColumnId) => {
    setVisibleCols(prev => {
      if (prev.includes(colId)) return prev.filter(id => id !== colId);
      // Insert after name, in definition order
      const ordered = ALL_COLUMNS.map(c => c.id).filter(id => id === colId || prev.includes(id));
      return ordered;
    });
    setHeaderCtxMenu(null);
  };

  // Build git status lookup: filename -> status
  const gitStatusMap = new Map<string, string>();
  if (gitRepoInfo?.is_repo && gitRepoInfo.root) {
    const repoRoot = gitRepoInfo.root.replace(/\\/g, '/').replace(/\/$/, '');
    const curNorm = currentPath.replace(/\\/g, '/').replace(/\/$/, '');
    for (const gf of gitFiles) {
      // gf.path is relative to repo root (forward slashes)
      const absPath = repoRoot + '/' + gf.path;
      // Get just the filename portion for the current directory
      const dirOfFile = absPath.substring(0, absPath.lastIndexOf('/'));
      if (dirOfFile === curNorm) {
        const name = absPath.substring(absPath.lastIndexOf('/') + 1);
        // Prefer showing unstaged status, but if only staged show that
        if (!gitStatusMap.has(name)) gitStatusMap.set(name, gf.status);
      }
    }
  }

  const sortedEntriesRaw = sortEntries(entries, sortField, sortAsc);
  const sortedEntries = filterText
    ? sortedEntriesRaw.filter((e) => e.name.toLowerCase().includes(filterText.toLowerCase()))
    : sortedEntriesRaw;

  // Group-by logic
  function getGroupKey(entry: FileEntry): string {
    switch (groupBy) {
      case 'type':
        if (entry.is_dir) return 'Folders';
        return (entry.extension || 'No extension').toUpperCase();
      case 'date': {
        if (!entry.modified) return 'Unknown';
        const d = new Date(entry.modified);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const days = diff / (1000 * 60 * 60 * 24);
        if (days < 1) return 'Today';
        if (days < 2) return 'Yesterday';
        if (days < 7) return 'This Week';
        if (days < 30) return 'This Month';
        if (days < 365) return 'This Year';
        return 'Older';
      }
      case 'size': {
        if (entry.is_dir) return 'Folders';
        if (entry.size === 0) return 'Empty';
        if (entry.size < 1024) return 'Tiny (< 1 KB)';
        if (entry.size < 1024 * 1024) return 'Small (< 1 MB)';
        if (entry.size < 100 * 1024 * 1024) return 'Medium (< 100 MB)';
        return 'Large (100 MB+)';
      }
      case 'letter': {
        const first = entry.name[0]?.toUpperCase() || '#';
        return /[A-Z]/.test(first) ? first : '#';
      }
      default:
        return '';
    }
  }

  // Build flat list with peek children and group headers
  const PEEK_VISIBLE = 5;
  type FlatItem = { entry: FileEntry; depth: number; isPeek: boolean; peekParent?: string; groupHeader?: string };
  const flatList: FlatItem[] = [];
  let lastGroup = '';
  for (const entry of sortedEntries) {
    if (groupBy !== 'none') {
      const gk = getGroupKey(entry);
      if (gk !== lastGroup) {
        flatList.push({ entry, depth: 0, isPeek: false, groupHeader: gk });
        lastGroup = gk;
      }
    }
    flatList.push({ entry, depth: 0, isPeek: false });
    if (peekPaths.has(entry.path) && peekChildren[entry.path]) {
      const children = peekChildren[entry.path];
      for (const child of children) {
        flatList.push({ entry: child, depth: 1, isPeek: true, peekParent: entry.path });
      }
    }
  }

  const containerRef = useRef<HTMLDivElement>(null);

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

  // File watcher (debounced to avoid OneDrive/cloud sync spam)
  const watcherDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const id = watcherIdRef.current;
    let unlisten: (() => void) | undefined;
    watchDir(id, currentPath).catch(() => {});
    onFsChange(id, () => {
      clearTimeout(watcherDebounce.current);
      watcherDebounce.current = setTimeout(() => refresh(), 500);
    }).then((fn) => { unlisten = fn; });
    return () => {
      clearTimeout(watcherDebounce.current);
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
      // Mark this tab as active on interaction
      store.getState().setActiveTab(tabId);
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
        // Plain click
        if (selectedPaths.size === 1 && selectedPaths.has(entry.path) && !entry.is_dir) {
          // Already selected - start slow-click rename timer
          slowClickPath.current = entry.path;
          clearTimeout(slowClickTimer.current);
          slowClickTimer.current = setTimeout(() => {
            if (slowClickPath.current === entry.path) {
              setRenamingPath(entry.path);
            }
            slowClickPath.current = null;
          }, 600);
        } else {
          // Normal select
          clearTimeout(slowClickTimer.current);
          slowClickPath.current = null;
          clearSelection();
          toggleSelected(entry.path);
          lastClickedIndex.current = index;
        }
      }
    },
    [tabId, sortedEntries, selectedPaths, setSelected, toggleSelected, clearSelection],
  );

  const handleDoubleClick = async (entry: FileEntry) => {
    clearTimeout(slowClickTimer.current);
    slowClickPath.current = null;
    if (entry.is_dir) {
      navigate(entry.path);
    } else if (entry.extension?.toLowerCase() === 'lnk') {
      // Resolve Windows shortcut and navigate to target
      try {
        const target = await resolveShortcut(entry.path);
        if (target) navigate(target);
      } catch {}
    } else {
      // Open file with system default application
      try {
        await openFile(entry.path);
      } catch (e) {
        console.error('Failed to open file:', e);
      }
    }
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
          setPeekChildren((prev) => ({ ...prev, [entry.path]: listing.entries }));
        } catch {}
      }
    }
    setPeekPaths(next);
  };

  const handleCopyPath = (path: string) => navigator.clipboard.writeText(path).catch(() => {});
  const handlePinToggle = (path: string) => {
    const current = pinnedPaths || [];
    if (current.includes(path)) {
      updateSettings({ pinned_paths: current.filter((p) => p !== path) });
    } else {
      updateSettings({ pinned_paths: [...current, path] });
    }
  };
  const isPathPinned = (path: string) => (pinnedPaths || []).includes(path);
  const handleNewTerminal = (cwd: string) => {
    if (panelId) {
      panelAddTab(panelId, { id: crypto.randomUUID(), type: 'terminal', title: 'Terminal', path: cwd, pinned: false });
    }
  };

  const colHeaderStyle = (field?: SortField): React.CSSProperties => ({
    padding: 'var(--density-pad-y) var(--density-pad-x)', fontSize: 'var(--file-font-size-sm)', fontWeight: 500,
    color: field && sortField === field ? 'var(--accent)' : 'var(--t3)',
    textAlign: 'left', cursor: field ? 'pointer' : 'default', userSelect: 'none',
    display: 'flex', alignItems: 'center', gap: 4, position: 'relative',
  });

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
        outline: dropHighlight ? '2px solid var(--accent)' : 'none',
        outlineOffset: -2,
      }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        // Focus this tab on any click
        store.getState().setActiveTab(tabId);
        if (e.button === 2) { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, entry: null }); }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Toolbar
        tabId={tabId}
        onRename={() => { if (selectedPaths.size === 1) setRenamingPath([...selectedPaths][0]); }}
        onDelete={() => {
          if (selectedPaths.size > 0) {
            deleteToTrash([...selectedPaths]).then(() => refresh()).catch(() => {});
          }
        }}
        sortField={sortField}
        sortAsc={sortAsc}
        onSort={(field) => handleSort(field as SortField)}
        filterText={filterText}
        onFilterChange={setFilterText}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        onSearch={() => window.dispatchEvent(new CustomEvent('open-fuzzy-search'))}
      />

      {/* Column headers with resize handles + right-click to configure */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: colWidths,
          borderBottom: '1px solid var(--border)', background: 'var(--base)',
        }}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => {
          if (e.button === 2) { e.preventDefault(); e.stopPropagation(); setHeaderCtxMenu({ x: e.clientX, y: e.clientY }); }
        }}
      >
        {activeColumns.map((col, idx) => (
          <div
            key={col.id}
            style={colHeaderStyle(col.sortField)}
            onClick={() => col.sortField && handleSort(col.sortField)}
          >
            {col.label} {col.sortField && sortField === col.sortField && (sortAsc ? <IconSortAsc /> : <IconSortDesc />)}
            {idx < activeColumns.length - 1 && (
              <ColResizeHandle onResize={(d) => {
                const nextCol = activeColumns[idx + 1];
                if (col.defaultWidth === 0) {
                  // Name column (1fr) -- resize shrinks/grows the next col
                  resizeColumn(nextCol.id, -d);
                } else {
                  resizeColumn(col.id, d);
                  if (nextCol) resizeColumn(nextCol.id, -d);
                }
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Column chooser context menu */}
      {headerCtxMenu && (
        <ColumnChooserMenu
          x={headerCtxMenu.x} y={headerCtxMenu.y}
          visibleCols={visibleCols}
          onToggle={toggleColumn}
          onClose={() => setHeaderCtxMenu(null)}
        />
      )}

      {/* File list */}
      {loading && <div style={{ padding: 24, color: 'var(--t3)', textAlign: 'center', flex: 1 }}>Loading...</div>}
      {error && <div style={{ padding: 24, color: 'var(--red)', textAlign: 'center', flex: 1 }}>{error}</div>}
      {!loading && !error && viewMode === 'list' && (
        <div
          ref={containerRef}
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
        >
          {(() => {
            const elements: React.ReactNode[] = [];
            let i = 0;
            while (i < flatList.length) {
              const item = flatList[i];
              // Group header
              if (item.groupHeader) {
                elements.push(
                  <div key={`group-${i}-${item.groupHeader}`} style={{
                    padding: 'var(--density-pad-y) var(--density-pad-x)', fontSize: 'var(--file-font-size-sm)', fontWeight: 600,
                    color: 'var(--accent)', textTransform: 'uppercase',
                    letterSpacing: '0.05em', borderBottom: '1px solid var(--border)',
                    background: 'var(--deep)', position: 'sticky', top: 0, zIndex: 5,
                  }}>
                    {item.groupHeader}
                  </div>
                );
                i++;
                continue;
              }
              if (!item.isPeek) {
                elements.push(
                  <FileRow
                    key={item.entry.path}
                    entry={item.entry}
                    selected={selectedPaths.has(item.entry.path)}
                    even={i % 2 === 0}
                    renaming={renamingPath === item.entry.path}
                    peekOpen={peekPaths.has(item.entry.path)}
                    peekEnabled={peekEnabled && item.entry.is_dir}
                    colWidths={colWidths}
                    columns={activeColumns}
                    gitStatus={gitStatusMap.get(item.entry.name)}
                    onClick={(e) => handleRowClick(item.entry, i, e)}
                    onDoubleClick={() => handleDoubleClick(item.entry)}
                    onContextMenu={(e) => { e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, entry: item.entry }); }}
                    onRenameDone={handleRenameDone}
                    onHover={handleHover}
                    onHoverEnd={handleHoverEnd}
                    onPeekToggle={() => handlePeekToggle(item.entry)}
                    onDragStart={(e) => handleDragStart(e, item.entry)}
                  />
                );
                i++;
              } else {
                // Collect consecutive peek rows for this parent into a container
                const parentPath = item.peekParent;
                const peekItems: typeof flatList = [];
                while (i < flatList.length && flatList[i].isPeek && flatList[i].peekParent === parentPath) {
                  peekItems.push(flatList[i]);
                  i++;
                }
                elements.push(
                  <div key={`peek-group-${parentPath}`} style={{
                    borderLeft: '2px solid var(--accent)',
                    marginLeft: 20,
                    marginBottom: 2,
                    background: 'var(--deep)',
                    borderRadius: '0 4px 4px 0',
                    maxHeight: `calc(${PEEK_VISIBLE} * var(--row-height))`,
                    overflowY: peekItems.length > PEEK_VISIBLE ? 'auto' : 'hidden',
                    overscrollBehavior: 'contain',
                  }}>
                    {peekItems.map((pi) => {
                      return (
                        <PeekRow
                          key={`peek-${pi.entry.path}`}
                          entry={pi.entry}
                          colWidths={colWidths}
                          columns={activeColumns}
                          selected={selectedPaths.has(pi.entry.path)}
                          onClick={(e) => {
                            e.stopPropagation();
                            clearSelection();
                            toggleSelected(pi.entry.path);
                            followSelection(pi.entry);
                          }}
                          onDoubleClick={() => handleDoubleClick(pi.entry)}
                        />
                      );
                    })}
                  </div>
                );
              }
            }
            return elements;
          })()}
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
          onPinToQuickAccess={handlePinToggle}
          isPinned={isPathPinned}
          onCut={(paths) => useExplorerStore.getState().cutPaths(paths)}
          onCopy={(paths) => useExplorerStore.getState().copyPaths(paths)}
          onPaste={() => useExplorerStore.getState().paste(tabId)}
          canPaste={useExplorerStore.getState().clipboardPaths.length > 0}
          selectedCount={selectedPaths.size}
          gitFileStatus={ctxMenu.entry ? gitStatusMap.get(ctxMenu.entry.name) || null : null}
          onGitStage={gitRepoInfo?.is_repo && gitRepoInfo.root ? (filePath: string) => {
            const getGitRelPath = (p: string, root: string) => {
              const norm = (s: string) => s.replace(/\\/g, '/').replace(/\/$/, '');
              return norm(p).replace(norm(root) + '/', '');
            };
            const relPath = getGitRelPath(filePath, gitRepoInfo.root!);
            useGitStore.getState().stage(gitRepoInfo.root!, [relPath]);
          } : undefined}
          onGitDiscard={gitRepoInfo?.is_repo && gitRepoInfo.root ? (filePath: string) => {
            const getGitRelPath = (p: string, root: string) => {
              const norm = (s: string) => s.replace(/\\/g, '/').replace(/\/$/, '');
              return norm(p).replace(norm(root) + '/', '');
            };
            const relPath = getGitRelPath(filePath, gitRepoInfo.root!);
            useGitStore.getState().discard(gitRepoInfo.root!, [relPath]);
          } : undefined}
        />
      )}
    </div>
  );
}
