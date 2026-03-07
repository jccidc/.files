import { useEffect, useState, useRef, useCallback } from 'react';
import { useLayoutStore } from '../../stores/layout';
import { useExplorerStore } from '../../stores/explorer';
import { usePreviewStore } from '../../stores/preview';
import { getDrives, readDir } from '../../api/filesystem';
import { useSettingsStore } from '../../stores/settings';
import { FileIcon } from '../common/FileIcon';
import { GitPanel } from './GitPanel';
import type { FileEntry } from '../../types';

function IconDrive() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--cyan)" strokeWidth="1.3">
      <rect x="2" y="4" width="12" height="8" rx="1.5" />
      <circle cx="11" cy="8" r="1" fill="var(--cyan)" />
      <line x1="4" y1="8" x2="8" y2="8" />
    </svg>
  );
}

function IconChevron({ expanded }: { expanded?: boolean }) {
  return (
    <svg
      width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="var(--t3)" strokeWidth="1.5"
      style={{ transition: 'transform 0.15s', transform: expanded ? 'rotate(90deg)' : 'none', flexShrink: 0 }}
    >
      <polyline points="2,1 6,4 2,7" />
    </svg>
  );
}

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '5px 12px',
  cursor: 'pointer',
  fontSize: 12,
  color: 'var(--t2)',
  borderRadius: 4,
  margin: '0 6px',
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function SidebarItem({ icon, label, onClick }: SidebarItemProps) {
  return (
    <div
      onClick={onClick}
      style={itemStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--hover)';
        e.currentTarget.style.color = 'var(--t1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--t2)';
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function SectionLabel({ text, collapsed, onToggle }: { text: string; collapsed?: boolean; onToggle?: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--t3)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '10px 12px 4px',
        cursor: onToggle ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        userSelect: 'none',
      }}
    >
      {onToggle && <IconChevron expanded={!collapsed} />}
      {text}
    </div>
  );
}

// ---- File Tree Node ----

function TreeNode({
  entry,
  depth,
  onFileClick,
}: {
  entry: FileEntry;
  depth: number;
  onFileClick: (entry: FileEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!entry.is_dir) {
      onFileClick(entry);
      return;
    }
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!children) {
      setLoading(true);
      try {
        const listing = await readDir(entry.path, false);
        setChildren(listing.entries);
      } catch {
        setChildren([]);
      }
      setLoading(false);
    }
  };

  return (
    <>
      <div
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 8px',
          paddingLeft: 8 + depth * 16,
          cursor: 'pointer',
          fontSize: 12,
          color: 'var(--t2)',
          borderRadius: 3,
          margin: '0 4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--hover)';
          e.currentTarget.style.color = 'var(--t1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--t2)';
        }}
      >
        {entry.is_dir ? (
          <IconChevron expanded={expanded} />
        ) : (
          <span style={{ width: 8, flexShrink: 0 }} />
        )}
        <FileIcon entry={entry} size={14} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.name}
        </span>
        {entry.is_dir && entry.children_count != null && (
          <span style={{ color: 'var(--t3)', fontSize: 10, marginLeft: 'auto', flexShrink: 0 }}>
            {entry.children_count}
          </span>
        )}
      </div>
      {expanded && loading && (
        <div style={{ paddingLeft: 8 + (depth + 1) * 16, fontSize: 11, color: 'var(--t3)', padding: '2px 8px' }}>
          ...
        </div>
      )}
      {expanded && children && children.map((child) => (
        <TreeNode key={child.path} entry={child} depth={depth + 1} onFileClick={onFileClick} />
      ))}
    </>
  );
}

// ---- Main Sidebar ----

export function Sidebar() {
  const { sidebarWidth, setSidebarWidth } = useLayoutStore();
  const navigate = useExplorerStore((s) => s.navigate);
  const currentPath = useExplorerStore((s) => s.currentPath);
  const entries = useExplorerStore((s) => s.entries);
  const followSelection = usePreviewStore((s) => s.followSelection);
  const pinnedPaths = useSettingsStore((s) => s.settings.pinned_paths) || [];
  const updateSettings = useSettingsStore((s) => s.update);
  const [drives, setDrives] = useState<string[]>([]);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [quickAccessCollapsed, setQuickAccessCollapsed] = useState(false);
  const [gitCollapsed, setGitCollapsed] = useState(false);
  const resizing = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  useEffect(() => {
    getDrives()
      .then(setDrives)
      .catch(() => setDrives(['C:\\']));
  }, []);

  // Detect user home from currentPath or fall back to common paths
  const userHome = currentPath.match(/^([A-Z]:\\Users\\[^\\]+)/i)?.[1] || 'C:\\Users\\Public';
  const defaultQuickAccess = [
    { label: 'Desktop', path: userHome + '\\Desktop' },
    { label: 'Documents', path: userHome + '\\Documents' },
    { label: 'Downloads', path: userHome + '\\Downloads' },
  ];

  const handleFileClick = (entry: FileEntry) => {
    followSelection(entry);
  };

  const handleUnpin = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateSettings({ pinned_paths: pinnedPaths.filter((p) => p !== path) });
  };

  const getLabelFromPath = (p: string) => {
    const segs = p.replace(/\\/g, '/').split('/').filter(Boolean);
    return segs[segs.length - 1] || p;
  };

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      resizing.current = true;
      startX.current = e.clientX;
      startW.current = sidebarWidth;
      e.preventDefault();

      const onMove = (ev: MouseEvent) => {
        if (!resizing.current) return;
        const delta = ev.clientX - startX.current;
        setSidebarWidth(startW.current + delta);
      };

      const onUp = () => {
        resizing.current = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [sidebarWidth, setSidebarWidth]
  );

  // Get folder name for Explorer section header
  const pathSegments = currentPath.replace(/\\/g, '/').split('/').filter(Boolean);
  const folderName = pathSegments[pathSegments.length - 1] || currentPath;

  return (
    <div
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        {/* EXPLORER section - file tree for current directory */}
        <SectionLabel text={`Explorer - ${folderName}`} collapsed={explorerCollapsed} onToggle={() => setExplorerCollapsed(!explorerCollapsed)} />
        {!explorerCollapsed && (
          <div style={{ marginBottom: 4 }}>
            {entries.map((entry) => (
              <TreeNode key={entry.path} entry={entry} depth={0} onFileClick={handleFileClick} />
            ))}
            {entries.length === 0 && (
              <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--t3)' }}>Empty</div>
            )}
          </div>
        )}

        {/* SOURCES section */}
        <SectionLabel text="Sources" collapsed={sourcesCollapsed} onToggle={() => setSourcesCollapsed(!sourcesCollapsed)} />
        {!sourcesCollapsed && (
          <>
            {drives.map((d) => (
              <SidebarItem key={d} icon={<IconDrive />} label={d} onClick={() => navigate(d)} />
            ))}
          </>
        )}

        <SectionLabel text="Quick Access" collapsed={quickAccessCollapsed} onToggle={() => setQuickAccessCollapsed(!quickAccessCollapsed)} />
        {!quickAccessCollapsed && (
          <>
            {/* Default items */}
            {defaultQuickAccess.map((qa) => (
              <SidebarItem
                key={qa.path}
                icon={<FileIcon entry={{ name: qa.label, path: qa.path, is_dir: true, is_hidden: false, is_symlink: false, size: 0, modified: '', created: '', extension: null, readonly: false, children_count: null }} size={14} />}
                label={qa.label}
                onClick={() => navigate(qa.path)}
              />
            ))}
            {/* Pinned items */}
            {pinnedPaths.map((p) => (
              <div
                key={p}
                style={{ display: 'flex', alignItems: 'center', margin: '0 6px', borderRadius: 4 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div
                  onClick={() => navigate(p)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--t2)',
                    overflow: 'hidden',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--accent)" stroke="none" style={{ flexShrink: 0 }}>
                    <circle cx="5" cy="5" r="3" />
                  </svg>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getLabelFromPath(p)}
                  </span>
                </div>
                <button
                  onClick={(e) => handleUnpin(p, e)}
                  title="Unpin"
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--t3)', padding: '2px 6px', fontSize: 11, borderRadius: 3,
                    display: 'flex', alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
                  </svg>
                </button>
              </div>
            ))}
          </>
        )}

        {/* GIT section */}
        <SectionLabel text="Git" collapsed={gitCollapsed} onToggle={() => setGitCollapsed(!gitCollapsed)} />
        {!gitCollapsed && <GitPanel />}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: 'absolute',
          top: 0,
          right: -2,
          width: 4,
          height: '100%',
          cursor: 'col-resize',
          zIndex: 10,
        }}
      />
    </div>
  );
}
