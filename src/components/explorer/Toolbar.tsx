import { useState, useRef, useEffect } from 'react';
import { useExplorerStore } from '../../stores/explorer';
import { usePreviewStore } from '../../stores/preview';

export type GroupBy = 'none' | 'type' | 'date' | 'size' | 'letter';

interface ToolbarProps {
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

// -- Component --

export function Toolbar({ onRename, onDelete, sortField, sortAsc, onSort, filterText, onFilterChange, groupBy, onGroupByChange, onSearch }: ToolbarProps) {
  const currentPath = useExplorerStore((s) => s.currentPath);
  const navigate = useExplorerStore((s) => s.navigate);
  const canGoBack = useExplorerStore((s) => s.canGoBack);
  const canGoForward = useExplorerStore((s) => s.canGoForward);
  const goBack = useExplorerStore((s) => s.goBack);
  const goForward = useExplorerStore((s) => s.goForward);
  const goUp = useExplorerStore((s) => s.goUp);
  const goHome = useExplorerStore((s) => s.goHome);
  const selectedPaths = useExplorerStore((s) => s.selectedPaths);
  const viewMode = useExplorerStore((s) => s.viewMode);
  const setViewMode = useExplorerStore((s) => s.setViewMode);
  const clipboardPaths = useExplorerStore((s) => s.clipboardPaths);
  const copyPaths = useExplorerStore((s) => s.copyPaths);
  const cutPaths = useExplorerStore((s) => s.cutPaths);
  const paste = useExplorerStore((s) => s.paste);
  const previewVisible = usePreviewStore((s) => s.panelVisible);
  const togglePreview = usePreviewStore((s) => s.togglePanel);

  const [sortOpen, setSortOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [pathEditing, setPathEditing] = useState(false);
  const [pathValue, setPathValue] = useState(currentPath);
  const sortRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const pathInputRef = useRef<HTMLInputElement>(null);

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
      if (e.ctrlKey && e.key === 'l') { e.preventDefault(); setPathEditing(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!sortOpen && !groupOpen) return;
    const handler = (e: MouseEvent) => {
      if (sortOpen && sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (groupOpen && groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sortOpen, groupOpen]);

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

  const handlePathKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { setPathEditing(false); navigate(pathValue); }
    else if (e.key === 'Escape') { setPathEditing(false); setPathValue(currentPath); }
  };

  const sortLabel = SORT_FIELDS.find((f) => f.key === sortField)?.label || 'Name';
  const groupLabel = GROUP_OPTIONS.find((g) => g.key === groupBy)?.label || 'None';

  // Build breadcrumb segments
  const segments = currentPath.replace(/\\/g, '/').split('/').filter(Boolean);

  return (
    <div style={{
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
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px',
        borderTop: '1px solid var(--border)', fontSize: 12, overflow: 'hidden',
        minHeight: 30,
      }}>
        {pathEditing ? (
          <input
            ref={pathInputRef}
            value={pathValue}
            onChange={(e) => setPathValue(e.target.value)}
            onKeyDown={handlePathKeyDown}
            onBlur={() => { setPathEditing(false); setPathValue(currentPath); }}
            style={{
              flex: 1, background: 'var(--surface)', border: '1px solid var(--accent)',
              borderRadius: 4, padding: '4px 8px', color: 'var(--t1)', fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace", outline: 'none',
            }}
          />
        ) : (
          <div
            onClick={() => setPathEditing(true)}
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
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {i > 0 && <IconChevron />}
                  <span
                    onClick={(e) => { e.stopPropagation(); navigate(fullPath); }}
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
    </div>
  );
}
