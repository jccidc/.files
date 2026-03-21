import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import { useExplorerStore } from '../../stores/explorer';
import { usePreviewStore } from '../../stores/preview';
import { TAG_TYPES, type TagId, type DirListing } from '../../types';

export type GroupBy = 'none' | 'type' | 'date' | 'size' | 'letter';
export type TagFilter = 'all' | 'any-tagged' | 'untagged' | TagId;

interface ToolbarProps {
  tabId: string;
  onRename: () => void;
  onDelete: () => void;
  sortField: string;
  sortAsc: boolean;
  onSort: (field: string) => void;
  filterText: string;
  onFilterChange: (text: string) => void;
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  onSearch: () => void;
  tagFilter: TagFilter;
  onTagFilterChange: (f: TagFilter) => void;
}

// -- Icon components (14x14, strokeWidth 1.5) --

function IconBack() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9,2 4,7 9,12" />
    </svg>
  );
}

function IconForward() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5,2 10,7 5,12" />
    </svg>
  );
}

function IconUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,9 7,4 12,9" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7L7 2L12 7" />
      <path d="M3 7V12H6V9H8V12H11V7" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="7" height="7" rx="1" />
      <path d="M9 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v5a1 1 0 001 1h2" />
    </svg>
  );
}

function IconCut() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="4" cy="11" r="2" />
      <circle cx="10" cy="11" r="2" />
      <line x1="10" y1="2" x2="4" y2="11" />
      <line x1="4" y1="2" x2="10" y2="11" />
    </svg>
  );
}

function IconPaste() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="8" height="9" rx="1" />
      <path d="M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1" />
    </svg>
  );
}

function IconRename() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2l3 3-8 8H1v-3z" />
      <line x1="7" y1="4" x2="10" y2="7" />
    </svg>
  );
}

function IconDelete() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,4 12,4" />
      <path d="M5 4V2h4v2" />
      <path d="M3 4l1 9h6l1-9" />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="3" x2="12" y2="3" />
      <line x1="5" y1="7" x2="12" y2="7" />
      <line x1="5" y1="11" x2="12" y2="11" />
      <circle cx="2.5" cy="3" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="7" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="11" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="4" height="4" rx="0.5" />
      <rect x="8" y="2" width="4" height="4" rx="0.5" />
      <rect x="2" y="8" width="4" height="4" rx="0.5" />
      <rect x="8" y="8" width="4" height="4" rx="0.5" />
    </svg>
  );
}

function IconPreview() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
      <circle cx="7" cy="7" r="2" />
    </svg>
  );
}

function IconSort() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="3" x2="3" y2="11" />
      <polyline points="1,9 3,11 5,9" />
      <line x1="8" y1="4" x2="13" y2="4" />
      <line x1="8" y1="7" x2="11" y2="7" />
      <line x1="8" y1="10" x2="9.5" y2="10" />
    </svg>
  );
}

function IconFilter() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1,2 13,2 8,8" />
      <line x1="8" y1="8" x2="8" y2="12" />
      <line x1="6" y1="10" x2="8" y2="12" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="4" />
      <line x1="9" y1="9" x2="12.5" y2="12.5" />
    </svg>
  );
}

function IconGroup() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="5" height="5" rx="0.5" />
      <rect x="8" y="1" width="5" height="5" rx="0.5" />
      <rect x="1" y="8" width="12" height="5" rx="0.5" />
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
    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" stroke="none">
      <polygon points="4,1 7,6 1,6" />
    </svg>
  );
}

function IconSortDesc() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" stroke="none">
      <polygon points="4,7 7,2 1,2" />
    </svg>
  );
}

// -- Styles --

const btnBase: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 4,
  background: 'transparent',
  border: 'none',
  color: 'var(--t3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  flexShrink: 0,
};

const btnDisabled: React.CSSProperties = {
  ...btnBase,
  opacity: 0.3,
  cursor: 'not-allowed',
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  color: 'var(--accent)',
};

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 20,
  background: 'var(--border)',
  flexShrink: 0,
  margin: '0 4px',
};

// -- Sort dropdown items --

const SORT_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'size', label: 'Size' },
  { key: 'modified', label: 'Modified' },
  { key: 'type', label: 'Type' },
];

const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'type', label: 'Type / Extension' },
  { key: 'date', label: 'Date Modified' },
  { key: 'size', label: 'Size Range' },
  { key: 'letter', label: 'First Letter' },
];

// -- Breadcrumb Dropdown --

function BreadcrumbDropdown({ x, y, items, currentFolder, onSelect, onClose }: {
  x: number;
  y: number;
  items: { name: string; path: string }[];
  currentFolder: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    requestAnimationFrame(() => document.addEventListener('mousedown', handler));
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, items.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && highlightIdx >= 0) { onSelect(items[highlightIdx].path); }
      if (e.key === 'Escape') { onClose(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [highlightIdx, items, onSelect, onClose]);

  return (
    <div ref={ref} style={{
      position: 'fixed', left: x, top: y, zIndex: 9999,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '4px 0', minWidth: 160, maxHeight: 300,
      overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    }}>
      {items.map((item, i) => (
        <div key={item.path}
          onMouseEnter={() => setHighlightIdx(i)}
          onClick={() => onSelect(item.path)}
          style={{
            padding: '6px 12px', cursor: 'pointer', fontSize: 12,
            background: highlightIdx === i ? 'var(--hover)' : 'transparent',
            color: item.name === currentFolder ? 'var(--accent)' : 'var(--t1)',
            fontWeight: item.name === currentFolder ? 600 : 400,
          }}
        >
          {item.name}
        </div>
      ))}
      {items.length === 0 && (
        <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--t3)' }}>No subfolders</div>
      )}
    </div>
  );
}

// -- Component --

export function Toolbar({ tabId, onRename, onDelete, sortField, sortAsc, onSort, filterText, onFilterChange, groupBy, onGroupByChange, onSearch, tagFilter, onTagFilterChange }: ToolbarProps) {
  const tabState = useExplorerStore((s) => s.tabStates[tabId]);
  const currentPath = tabState?.currentPath ?? 'C:\\';
  const canGoBack = tabState?.canGoBack ?? false;
  const canGoForward = tabState?.canGoForward ?? false;
  const selectedPaths = tabState?.selectedPaths ?? new Set<string>();
  const viewMode = tabState?.viewMode ?? 'list';
  const clipboardPaths = useExplorerStore((s) => s.clipboardPaths);

  const navigate = (path: string) => useExplorerStore.getState().navigate(tabId, path);
  const goBack = () => useExplorerStore.getState().goBack(tabId);
  const goForward = () => useExplorerStore.getState().goForward(tabId);
  const goUp = () => useExplorerStore.getState().goUp(tabId);
  const goHome = () => useExplorerStore.getState().goHome(tabId);
  const setViewMode = (mode: string) => useExplorerStore.getState().setViewMode(tabId, mode as any);
  const copyPaths = (paths: string[]) => useExplorerStore.getState().copyPaths(paths);
  const cutPaths = (paths: string[]) => useExplorerStore.getState().cutPaths(paths);
  const paste = () => useExplorerStore.getState().paste(tabId);
  const previewVisible = usePreviewStore((s) => s.panelVisible);
  const togglePreview = usePreviewStore((s) => s.togglePanel);

  const [sortOpen, setSortOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [tagFilterOpen, setTagFilterOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [pathEditing, setPathEditing] = useState(false);
  const [pathSuggestions, setPathSuggestions] = useState<{ label: string; path: string }[]>([]);
  const [pathSuggestionIdx, setPathSuggestionIdx] = useState(-1);
  const [pathValue, setPathValue] = useState(currentPath);
  const [pathCtxMenu, setPathCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [breadcrumbDropdown, setBreadcrumbDropdown] = useState<{
    idx: number;
    x: number;
    y: number;
    items: { name: string; path: string }[];
  } | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const tagFilterRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const pathInputRef = useRef<HTMLInputElement>(null);
  const pathSubmittedRef = useRef(false);

  const hasSelection = selectedPaths.size > 0;
  const hasSingleSelection = selectedPaths.size === 1;
  const hasClipboard = clipboardPaths.length > 0;

  // Sync path value when navigation changes
  useEffect(() => { setPathValue(currentPath); }, [currentPath]);

  // Focus path input when editing
  useEffect(() => {
    if (pathEditing && pathInputRef.current) {
      pathInputRef.current.focus();
      pathInputRef.current.select();
    }
  }, [pathEditing]);

  // Ctrl+L to edit path
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'l') { e.preventDefault(); setPathValue(useExplorerStore.getState().getTab(tabId).currentPath); setPathEditing(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!sortOpen && !groupOpen && !tagFilterOpen) return;
    const handler = (e: MouseEvent) => {
      if (sortOpen && sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (groupOpen && groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupOpen(false);
      if (tagFilterOpen && tagFilterRef.current && !tagFilterRef.current.contains(e.target as Node)) setTagFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sortOpen, groupOpen, tagFilterOpen]);

  // Close path context menu on outside click
  useEffect(() => {
    if (!pathCtxMenu) return;
    const handler = () => setPathCtxMenu(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pathCtxMenu]);

  // Focus filter input when opened
  useEffect(() => {
    if (filterOpen && filterInputRef.current) filterInputRef.current.focus();
  }, [filterOpen]);

  const handleBtnHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    if (btn.disabled) return;
    btn.style.background = 'var(--hover)';
    btn.style.color = 'var(--t1)';
  };

  const handleBtnLeave = (e: React.MouseEvent<HTMLButtonElement>, active?: boolean) => {
    const btn = e.currentTarget;
    btn.style.background = 'transparent';
    btn.style.color = active ? 'var(--accent)' : 'var(--t3)';
  };

  // Path bar autocomplete suggestions
  const PATH_SUGGESTIONS_SPECIAL = [
    { label: 'Recycle Bin', path: 'recycle-bin', aliases: ['recycle', 'recyclebin', 'trash', 'bin'] },
    { label: 'This PC', path: 'this-pc', aliases: ['thispc', 'this pc', 'my computer', 'computer'] },
    { label: 'Desktop', path: '', aliases: ['desktop'] },
    { label: 'Documents', path: '', aliases: ['documents', 'docs'] },
    { label: 'Downloads', path: '', aliases: ['downloads'] },
    { label: 'Pictures', path: '', aliases: ['pictures', 'photos'] },
    { label: 'Music', path: '', aliases: ['music'] },
    { label: 'Videos', path: '', aliases: ['videos'] },
  ];

  const updatePathSuggestions = useCallback(async (val: string) => {
    const q = val.trim().toLowerCase();
    if (!q || q.length < 1) { setPathSuggestions([]); return; }

    const matches: { label: string; path: string }[] = [];

    // Match special paths & known folders
    for (const s of PATH_SUGGESTIONS_SPECIAL) {
      if (s.label.toLowerCase().startsWith(q) || s.aliases.some(a => a.startsWith(q))) {
        if (s.path) {
          matches.push({ label: s.label, path: s.path });
        } else {
          // Known folder — resolve path from system
          try {
            const { getKnownFolderPaths } = await import('../../api/filesystem');
            const folders = await getKnownFolderPaths();
            const found = folders.find(([l]) => l === s.label);
            if (found) matches.push({ label: s.label, path: found[1] });
          } catch {}
        }
      }
    }

    // Match directory contents if typing a path with backslash
    if (val.includes('\\') || val.includes('/')) {
      try {
        const normalized = val.replace(/\//g, '\\');
        const lastSlash = normalized.lastIndexOf('\\');
        const parentDir = normalized.substring(0, lastSlash + 1);
        const prefix = normalized.substring(lastSlash + 1).toLowerCase();
        if (parentDir) {
          const listing = await invoke<DirListing>('read_dir', { path: parentDir, showHidden: false });
          const dirMatches = listing.entries
            .filter(e => e.is_dir && e.name.toLowerCase().startsWith(prefix))
            .slice(0, 8)
            .map(e => ({ label: e.name, path: e.path }));
          matches.push(...dirMatches);
        }
      } catch {}
    }

    setPathSuggestions(matches.slice(0, 10));
    setPathSuggestionIdx(-1);
  }, []);

  const acceptSuggestion = (suggestion: { label: string; path: string }) => {
    pathSubmittedRef.current = true;
    setPathEditing(false);
    setPathSuggestions([]);
    navigate(suggestion.path);
  };

  const handlePathKeyDown = (e: React.KeyboardEvent) => {
    if (pathSuggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setPathSuggestionIdx(i => Math.min(i + 1, pathSuggestions.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setPathSuggestionIdx(i => Math.max(i - 1, -1)); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && pathSuggestionIdx >= 0)) {
        e.preventDefault();
        const idx = pathSuggestionIdx >= 0 ? pathSuggestionIdx : 0;
        acceptSuggestion(pathSuggestions[idx]);
        return;
      }
    }
    if (e.key === 'Enter') {
      pathSubmittedRef.current = true;
      setPathEditing(false);
      setPathSuggestions([]);
      // Recognize special path names
      const val = pathValue.trim().toLowerCase();
      if (val === 'recycle bin' || val === 'recyclebin' || val === 'trash') {
        navigate('recycle-bin');
      } else if (val === 'this pc' || val === 'thispc' || val === 'my computer') {
        navigate('this-pc');
      } else {
        navigate(pathValue);
      }
    }
    else if (e.key === 'Escape') { pathSubmittedRef.current = true; setPathEditing(false); setPathValue(currentPath); setPathSuggestions([]); }
  };

  const sortLabel = SORT_FIELDS.find((f) => f.key === sortField)?.label || 'Name';
  const groupLabel = GROUP_OPTIONS.find((g) => g.key === groupBy)?.label || 'None';

  // Build breadcrumb segments
  const SPECIAL_PATH_LABELS: Record<string, string> = { 'this-pc': 'This PC', 'recycle-bin': 'Recycle Bin' };
  const segments = SPECIAL_PATH_LABELS[currentPath]
    ? [SPECIAL_PATH_LABELS[currentPath]]
    : currentPath.replace(/\\/g, '/').split('/').filter(Boolean);

  return (
    <div data-toolbar style={{
      background: 'var(--toolbar-bg, var(--base))',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Top row: nav + actions + view + sort + group + filter */}
      <div style={{
        height: 36,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0 8px',
        gap: 2,
      }}>
        {/* Navigation */}
        <button
          style={canGoBack ? btnBase : btnDisabled}
          disabled={!canGoBack}
          onClick={goBack}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e)}
          title="Back (Alt+Left)"
        >
          <IconBack />
        </button>
        <button
          style={canGoForward ? btnBase : btnDisabled}
          disabled={!canGoForward}
          onClick={goForward}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e)}
          title="Forward (Alt+Right)"
        >
          <IconForward />
        </button>
        <button
          style={btnBase}
          onClick={goUp}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e)}
          title="Up (Alt+Up)"
        >
          <IconUp />
        </button>
        <button
          style={btnBase}
          onClick={goHome}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e)}
          title="Home (Alt+Home)"
        >
          <IconHome />
        </button>

        <div style={dividerStyle} />

        {/* File Actions */}
        <button
          style={hasSelection ? btnBase : btnDisabled}
          disabled={!hasSelection}
          onClick={() => copyPaths([...selectedPaths])}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e)}
          title="Copy (Ctrl+C)"
        >
          <IconCopy />
        </button>
        <button
          style={hasSelection ? btnBase : btnDisabled}
          disabled={!hasSelection}
          onClick={() => cutPaths([...selectedPaths])}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e)}
          title="Cut (Ctrl+X)"
        >
          <IconCut />
        </button>
        <button
          style={hasClipboard ? btnBase : btnDisabled}
          disabled={!hasClipboard}
          onClick={paste}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e)}
          title="Paste (Ctrl+V)"
        >
          <IconPaste />
        </button>
        <button
          style={hasSingleSelection ? btnBase : btnDisabled}
          disabled={!hasSingleSelection}
          onClick={onRename}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e)}
          title="Rename (F2)"
        >
          <IconRename />
        </button>
        <button
          style={hasSelection ? btnBase : btnDisabled}
          disabled={!hasSelection}
          onClick={onDelete}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e)}
          title="Delete (Del)"
        >
          <IconDelete />
        </button>

        <div style={dividerStyle} />

        {/* View toggles */}
        <button
          style={viewMode === 'list' ? btnActive : btnBase}
          onClick={() => setViewMode('list')}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e, viewMode === 'list')}
          title="List view"
        >
          <IconList />
        </button>
        <button
          style={viewMode === 'grid' ? btnActive : btnBase}
          onClick={() => setViewMode('grid')}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e, viewMode === 'grid')}
          title="Grid view"
        >
          <IconGrid />
        </button>
        <button
          style={viewMode === 'columns' ? btnActive : btnBase}
          onClick={() => setViewMode('columns')}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e, viewMode === 'columns')}
          title="Columns view"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="1" width="3" height="12" rx="0.5" /><rect x="5.5" y="1" width="3" height="12" rx="0.5" /><rect x="10" y="1" width="3" height="12" rx="0.5" /></svg>
        </button>
        <button
          style={viewMode === 'gallery' ? btnActive : btnBase}
          onClick={() => setViewMode('gallery')}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e, viewMode === 'gallery')}
          title="Gallery view"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="1" width="12" height="8" rx="1" /><rect x="2" y="11" width="2" height="2" rx="0.5" /><rect x="5" y="11" width="2" height="2" rx="0.5" /><rect x="8" y="11" width="2" height="2" rx="0.5" /><rect x="11" y="11" width="2" height="2" rx="0.5" /></svg>
        </button>
        <button
          style={viewMode === 'tiles' ? btnActive : btnBase}
          onClick={() => setViewMode('tiles')}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e, viewMode === 'tiles')}
          title="Tiles view"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="1" width="5" height="5" rx="0.5" /><rect x="8" y="1" width="5" height="5" rx="0.5" /><rect x="1" y="8" width="5" height="5" rx="0.5" /><rect x="8" y="8" width="5" height="5" rx="0.5" /></svg>
        </button>
        <button
          style={viewMode === 'flat' ? btnActive : btnBase}
          onClick={() => setViewMode('flat')}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e, viewMode === 'flat')}
          title="Flat view (all files recursive)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2"><line x1="1" y1="3" x2="13" y2="3" /><line x1="1" y1="6" x2="13" y2="6" /><line x1="1" y1="9" x2="13" y2="9" /><line x1="1" y1="12" x2="13" y2="12" /></svg>
        </button>
        <button
          style={viewMode === 'treemap' ? btnActive : btnBase}
          onClick={() => setViewMode('treemap')}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e, viewMode === 'treemap')}
          title="Treemap view (disk space visualization)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="1" width="7" height="8" rx="0.5" /><rect x="9" y="1" width="4" height="4" rx="0.5" /><rect x="9" y="6" width="4" height="3" rx="0.5" /><rect x="1" y="10" width="4" height="3" rx="0.5" /><rect x="6" y="10" width="3" height="3" rx="0.5" /><rect x="10" y="10" width="3" height="3" rx="0.5" /></svg>
        </button>

        <div style={dividerStyle} />

        <button
          style={previewVisible ? btnActive : btnBase}
          onClick={togglePreview}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e, previewVisible)}
          title="Preview panel (Ctrl+Shift+P)"
        >
          <IconPreview />
        </button>

        <div style={dividerStyle} />

        {/* Sort dropdown */}
        <div ref={sortRef} style={{ position: 'relative' }}>
          <button
            style={{ ...btnBase, width: 'auto', padding: '0 6px', gap: 4, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
            onClick={() => setSortOpen(!sortOpen)}
            onMouseEnter={handleBtnHover}
            onMouseLeave={(e) => handleBtnLeave(e)}
            title="Sort"
          >
            <IconSort />
            <span style={{ color: 'var(--t2)', fontSize: 11 }}>{sortLabel}</span>
            {sortAsc ? <IconSortAsc /> : <IconSortDesc />}
          </button>
          {sortOpen && (
            <div style={{
              position: 'absolute', top: 30, left: 0,
              background: 'var(--raised)', border: '1px solid var(--border)',
              borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              zIndex: 100, minWidth: 140, padding: '4px 0',
            }}>
              {SORT_FIELDS.map((f) => (
                <div
                  key={f.key}
                  onClick={() => { onSort(f.key); setSortOpen(false); }}
                  style={{
                    padding: '6px 12px', fontSize: 12,
                    color: sortField === f.key ? 'var(--accent)' : 'var(--t2)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span>{f.label}</span>
                  {sortField === f.key && (
                    <span style={{ color: 'var(--accent)' }}>
                      {sortAsc ? <IconSortAsc /> : <IconSortDesc />}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Group By dropdown */}
        <div ref={groupRef} style={{ position: 'relative' }}>
          <button
            style={{ ...btnBase, width: 'auto', padding: '0 6px', gap: 4, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
            onClick={() => setGroupOpen(!groupOpen)}
            onMouseEnter={handleBtnHover}
            onMouseLeave={(e) => handleBtnLeave(e, groupBy !== 'none')}
            title="Group by"
          >
            <IconGroup />
            {groupBy !== 'none' && <span style={{ color: 'var(--accent)', fontSize: 11 }}>{groupLabel}</span>}
          </button>
          {groupOpen && (
            <div style={{
              position: 'absolute', top: 30, left: 0,
              background: 'var(--raised)', border: '1px solid var(--border)',
              borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              zIndex: 100, minWidth: 160, padding: '4px 0',
            }}>
              {GROUP_OPTIONS.map((g) => (
                <div
                  key={g.key}
                  onClick={() => { onGroupByChange(g.key); setGroupOpen(false); }}
                  style={{
                    padding: '6px 12px', fontSize: 12,
                    color: groupBy === g.key ? 'var(--accent)' : 'var(--t2)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {g.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tag filter dropdown */}
        <div ref={tagFilterRef} style={{ position: 'relative' }}>
          <button
            style={tagFilter !== 'all' ? { ...btnBase, color: 'var(--accent)' } : btnBase}
            onClick={() => setTagFilterOpen(!tagFilterOpen)}
            onMouseEnter={handleBtnHover}
            onMouseLeave={(e) => handleBtnLeave(e, tagFilter !== 'all')}
            title="Filter by tag"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 2h5l5 5-4 4-5-5V2z" />
              <circle cx="4" cy="5" r="1" fill="currentColor" stroke="none" />
            </svg>
          </button>
          {tagFilterOpen && (
            <div style={{
              position: 'absolute', top: 30, left: 0,
              background: 'var(--raised)', border: '1px solid var(--border)',
              borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              zIndex: 100, minWidth: 160, padding: '4px 0',
            }}>
              {[
                { key: 'all' as TagFilter, label: 'All Files', icon: '' },
                { key: 'any-tagged' as TagFilter, label: 'Any Tagged', icon: '' },
                { key: 'untagged' as TagFilter, label: 'Untagged', icon: '' },
              ].map(({ key, label }) => (
                <div
                  key={key}
                  onClick={() => { onTagFilterChange(key); setTagFilterOpen(false); }}
                  style={{
                    padding: '6px 12px', fontSize: 12,
                    color: tagFilter === key ? 'var(--accent)' : 'var(--t2)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {label}
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
              {(Object.entries(TAG_TYPES) as [TagId, typeof TAG_TYPES[TagId]][]).map(([id, tag]) => (
                <div
                  key={id}
                  onClick={() => { onTagFilterChange(id); setTagFilterOpen(false); }}
                  style={{
                    padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8,
                    color: tagFilter === id ? 'var(--accent)' : 'var(--t2)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 14 }}>{tag.icon}</span>
                  <span>{tag.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={dividerStyle} />

        {/* Filter */}
        <button
          style={filterOpen ? btnActive : btnBase}
          onClick={() => {
            if (filterOpen) { setFilterOpen(false); onFilterChange(''); }
            else setFilterOpen(true);
          }}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e, filterOpen)}
          title="Filter"
        >
          <IconFilter />
        </button>
        {filterOpen && (
          <input
            ref={filterInputRef}
            value={filterText}
            onChange={(e) => onFilterChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setFilterOpen(false); onFilterChange(''); } }}
            placeholder="Filter..."
            style={{
              height: 24, width: 140, background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 4,
              padding: '0 8px', color: 'var(--t1)', fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace", outline: 'none', flexShrink: 0,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
        )}
      </div>

      {/* Bottom row: breadcrumb / editable path bar */}
      <div data-breadcrumb style={{
        display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px',
        borderTop: '1px solid var(--border)', fontSize: 12, overflow: 'visible',
        minHeight: 30, position: 'relative',
      }}>
        {pathEditing ? (
          <>
          <input
            ref={pathInputRef}
            value={pathValue}
            onChange={(e) => { setPathValue(e.target.value); updatePathSuggestions(e.target.value); }}
            onKeyDown={handlePathKeyDown}
            onBlur={() => { setTimeout(() => { if (!pathSubmittedRef.current && !pathCtxMenu) { setPathEditing(false); setPathValue(currentPath); setPathSuggestions([]); } pathSubmittedRef.current = false; }, 200); }}
            onMouseDown={(e) => {
              if (e.button === 2) {
                e.preventDefault();
                e.stopPropagation();
                setPathCtxMenu({ x: e.clientX, y: e.clientY });
              }
            }}
            style={{
              flex: 1, background: 'var(--surface)', border: '1px solid var(--accent)',
              borderRadius: 4, padding: '4px 8px', color: 'var(--t1)', fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace", outline: 'none',
            }}
          />
          {pathSuggestions.length > 0 && (
            <div style={{
              position: 'absolute', left: 0, right: 0, top: '100%', zIndex: 9999,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '0 0 6px 6px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              maxHeight: 200, overflowY: 'auto',
            }}>
              {pathSuggestions.map((s, i) => (
                <div key={s.path}
                  onMouseDown={(e) => { e.preventDefault(); acceptSuggestion(s); }}
                  onMouseEnter={() => setPathSuggestionIdx(i)}
                  style={{
                    padding: '6px 12px', cursor: 'pointer', fontSize: 12,
                    background: pathSuggestionIdx === i ? 'var(--hover)' : 'transparent',
                    color: 'var(--t1)', display: 'flex', justifyContent: 'space-between', gap: 8,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{s.label}</span>
                  <span style={{ color: 'var(--t3)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.path}</span>
                </div>
              ))}
            </div>
          )}
          {pathCtxMenu && (
            <div
              style={{
                position: 'fixed', left: pathCtxMenu.x, top: pathCtxMenu.y, zIndex: 9999,
                background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 6,
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)', padding: 4, minWidth: 120,
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseLeave={() => {}}
            >
              {[
                { label: 'Cut', fn: 'cut' },
                { label: 'Copy', fn: 'copy' },
                { label: 'Paste', fn: 'paste' },
                { label: 'Select All', fn: 'selectall' },
              ].map(({ label, fn }) => (
                <button
                  key={label}
                  onClick={() => {
                    if (fn === 'paste') {
                      navigator.clipboard.readText().then((text) => {
                        const input = pathInputRef.current;
                        if (input) {
                          const start = input.selectionStart ?? pathValue.length;
                          const end = input.selectionEnd ?? pathValue.length;
                          setPathValue(pathValue.slice(0, start) + text + pathValue.slice(end));
                        }
                      }).catch(() => {});
                    } else if (fn === 'selectall') {
                      pathInputRef.current?.select();
                    } else {
                      document.execCommand(fn);
                    }
                    setPathCtxMenu(null);
                    pathInputRef.current?.focus();
                  }}
                  style={{
                    display: 'block', width: '100%', padding: '6px 12px', border: 'none',
                    background: 'transparent', color: 'var(--t1)', fontSize: 12,
                    textAlign: 'left', cursor: 'pointer', borderRadius: 4,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          </>
        ) : (
          <div
            onClick={() => { setPathValue(currentPath); setPathEditing(true); }}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 2,
              cursor: 'text', overflow: 'hidden', padding: '2px 4px',
              borderRadius: 4, background: 'var(--deep)',
            }}
            title="Click or Ctrl+L to edit path"
          >
            {segments.map((seg, i) => {
              const partial = segments.slice(0, i + 1).join('\\');
              const fullPath = i === 0 ? partial + '\\' : partial;
              return (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {i > 0 && <IconChevron />}
                  <span
                    onClick={(e) => { e.stopPropagation(); navigate(fullPath); }}
                    style={{ cursor: 'pointer', color: 'var(--t2)', padding: '2px 4px', borderRadius: 3 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--t1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; }}
                  >
                    {seg}
                  </span>
                  <span
                    onMouseDown={(e) => { e.stopPropagation(); }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log('[breadcrumb] chevron clicked, segment:', i, 'path:', fullPath);
                      if (breadcrumbDropdown?.idx === i) { setBreadcrumbDropdown(null); return; }
                      const rect = e.currentTarget.getBoundingClientRect();
                      try {
                        const listing = await invoke<DirListing>('read_dir', { path: fullPath, showHidden: false });
                        const dirs = listing.entries
                          .filter(entry => entry.is_dir)
                          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                          .map(entry => ({ name: entry.name, path: entry.path }));
                        console.log('[breadcrumb] got', dirs.length, 'dirs');
                        setBreadcrumbDropdown({ idx: i, x: rect.left, y: rect.bottom + 2, items: dirs });
                      } catch (err) { console.error('[breadcrumb] error:', err); }
                    }}
                    style={{
                      cursor: 'pointer', padding: '2px 4px', borderRadius: 3, display: 'inline-flex',
                      alignItems: 'center', color: breadcrumbDropdown?.idx === i ? 'var(--accent)' : 'var(--t3)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--t1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = breadcrumbDropdown?.idx === i ? 'var(--accent)' : 'var(--t3)'; }}
                    title="Show sibling folders"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" stroke="none">
                      <polygon points="2,3 8,3 5,7" />
                    </svg>
                  </span>
                </span>
              );
            })}
          </div>
        )}

        {/* Search (opens fuzzy search modal) */}
        <button
          style={btnBase}
          onClick={onSearch}
          onMouseEnter={handleBtnHover}
          onMouseLeave={(e) => handleBtnLeave(e)}
          title="Search files (Ctrl+P)"
        >
          <IconSearch />
        </button>
      </div>

      {breadcrumbDropdown && createPortal(
        <BreadcrumbDropdown
          x={breadcrumbDropdown.x}
          y={breadcrumbDropdown.y}
          items={breadcrumbDropdown.items}
          currentFolder={segments[breadcrumbDropdown.idx + 1] ?? ''}
          onSelect={(folderPath) => {
            navigate(folderPath);
            setBreadcrumbDropdown(null);
          }}
          onClose={() => setBreadcrumbDropdown(null)}
        />,
        document.body
      )}
    </div>
  );
}
