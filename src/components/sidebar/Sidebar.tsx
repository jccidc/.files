import { useEffect, useState, useRef, useCallback } from 'react';
import { useLayoutStore } from '../../stores/layout';
import { useExplorerStore } from '../../stores/explorer';
import { getDrives, getKnownFolderPaths, readDir } from '../../api/filesystem';
import { useSettingsStore } from '../../stores/settings';
import { useGitStore } from '../../stores/git';
import { FileIcon } from '../common/FileIcon';
import { GitPanel } from './GitPanel';
import { CloudSources } from './CloudSources';
import type { DriveInfo, FileEntry } from '../../types';

// ---- Icons ----

function IconDriveFixed() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--cyan)" strokeWidth="1.3">
      <rect x="2" y="4" width="12" height="8" rx="1.5" />
      <circle cx="11" cy="8" r="1" fill="var(--cyan)" />
      <line x1="4" y1="8" x2="8" y2="8" />
    </svg>
  );
}

function IconDriveRemovable() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--green)" strokeWidth="1.3">
      <rect x="4" y="2" width="8" height="12" rx="1.5" />
      <line x1="6" y1="5" x2="10" y2="5" />
      <circle cx="8" cy="10" r="1" fill="var(--green)" />
    </svg>
  );
}

function IconDriveNetwork() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--purple)" strokeWidth="1.3">
      <rect x="2" y="4" width="12" height="8" rx="1.5" />
      <circle cx="5" cy="8" r="1" fill="var(--purple)" />
      <circle cx="11" cy="8" r="1" fill="var(--purple)" />
      <line x1="6" y1="8" x2="10" y2="8" />
    </svg>
  );
}

function IconDriveCdrom() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--yellow)" strokeWidth="1.3">
      <circle cx="8" cy="8" r="6" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function DriveIcon({ type }: { type: string }) {
  switch (type) {
    case 'removable': return <IconDriveRemovable />;
    case 'network': return <IconDriveNetwork />;
    case 'cdrom': return <IconDriveCdrom />;
    default: return <IconDriveFixed />;
  }
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

function IconDrag() {
  return (
    <svg width="8" height="14" viewBox="0 0 8 14" fill="var(--t3)" stroke="none" style={{ flexShrink: 0, opacity: 0.5 }}>
      <circle cx="2.5" cy="2" r="1" /><circle cx="5.5" cy="2" r="1" />
      <circle cx="2.5" cy="5.5" r="1" /><circle cx="5.5" cy="5.5" r="1" />
      <circle cx="2.5" cy="9" r="1" /><circle cx="5.5" cy="9" r="1" />
      <circle cx="2.5" cy="12.5" r="1" /><circle cx="5.5" cy="12.5" r="1" />
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

// ---- Expandable Folder Tree Item ----

export function FolderTreeItem({ path, label, icon, depth, onNavigate }: {
  path: string; label: string; icon: React.ReactNode; depth: number; onNavigate: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(null);
  const showHidden = useSettingsStore((s) => s.settings.show_hidden);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!expanded && !children) {
      try {
        const listing = await readDir(path, showHidden);
        setChildren(listing.entries.filter((e) => e.is_dir));
      } catch {
        setChildren([]);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <div>
      <div
        onClick={() => onNavigate(path)}
        style={{
          ...itemStyle,
          paddingLeft: 12 + depth * 16,
          gap: 6,
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
        <span onClick={toggle} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <IconChevron expanded={expanded} />
        </span>
        {icon}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </div>
      {expanded && children && children.map((child) => (
        <FolderTreeItem
          key={child.path}
          path={child.path}
          label={child.name}
          icon={<FileIcon entry={child} size={14} />}
          depth={depth + 1}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

// ---- Section Label (draggable) ----

function SectionLabel({ text, collapsed, onToggle, onPointerDown, dragOver, dragging }: {
  text: string; collapsed?: boolean; onToggle?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  dragOver?: boolean;
  dragging?: boolean;
}) {
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
        borderTop: dragOver ? '2px solid var(--accent)' : '2px solid transparent',
        opacity: dragging ? 0.5 : 1,
      }}
    >
      <span
        onPointerDown={onPointerDown}
        style={{ cursor: 'grab', display: 'flex', alignItems: 'center', touchAction: 'none' }}
      >
        <IconDrag />
      </span>
      {onToggle && <IconChevron expanded={!collapsed} />}
      {text}
    </div>
  );
}

// ---- Main Sidebar ----

export function Sidebar() {
  const { sidebarWidth, setSidebarWidth } = useLayoutStore();
  const navigate = useExplorerStore((s) => s.navigate);
  const currentPath = useExplorerStore((s) => s.currentPath);
  const pinnedPaths = useSettingsStore((s) => s.settings.pinned_paths) || [];
  const updateSettings = useSettingsStore((s) => s.update);
  const sectionOrder = useSettingsStore((s) => s.settings.sidebar_section_order) || ['sources', 'cloud', 'quick-access', 'git'];
  const isGitRepo = useGitStore((s) => s.repoInfo?.is_repo ?? false);
  const checkRepo = useGitStore((s) => s.checkRepo);

  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [quickAccessDefaults, setQuickAccessDefaults] = useState<{ label: string; path: string }[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragSection, setDragSection] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const resizing = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);
  const dragStartY = useRef(0);

  const refreshDrives = useCallback(() => {
    getDrives()
      .then(setDrives)
      .catch(() => setDrives([{ letter: 'C:\\', drive_type: 'fixed', label: 'Local Disk (C:)', is_cloud: false }]));
  }, []);

  useEffect(() => {
    refreshDrives();

    getKnownFolderPaths()
      .then((folders) => {
        setQuickAccessDefaults(folders.map(([label, path]) => ({ label, path })));
      })
      .catch(() => {
        const home = 'C:\\Users\\Public';
        setQuickAccessDefaults([
          { label: 'Desktop', path: home + '\\Desktop' },
          { label: 'Documents', path: home + '\\Documents' },
          { label: 'Downloads', path: home + '\\Downloads' },
        ]);
      });

    // Poll for drive changes every 5 seconds (hot-plug detection)
    const interval = setInterval(refreshDrives, 5000);
    return () => clearInterval(interval);
  }, [refreshDrives]);

  const ejectDrive = useCallback(async (driveLetter: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('eject_drive', { letter: driveLetter });
      refreshDrives();
    } catch {
      // Eject failed silently
    }
  }, [refreshDrives]);

  // Fix chicken-and-egg: check git repo from Sidebar on path change
  // so the Git section can show even before GitPanel mounts
  useEffect(() => {
    checkRepo(currentPath);
  }, [currentPath, checkRepo]);

  const toggleCollapsed = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleUnpin = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateSettings({ pinned_paths: pinnedPaths.filter((p) => p !== path) });
  };

  const getLabelFromPath = (p: string) => {
    const segs = p.replace(/\\/g, '/').split('/').filter(Boolean);
    return segs[segs.length - 1] || p;
  };

  // Pointer-event-based drag-to-reorder (replaces unreliable HTML5 DnD)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleSectionPointerDown = (sectionId: string, e: React.PointerEvent) => {
    // Only start drag on left button on the drag handle area
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDragSection(sectionId);
    dragStartY.current = e.clientY;

    const onMove = (ev: PointerEvent) => {
      // Determine which section the pointer is over
      let overSection: string | null = null;
      for (const id of sectionOrder) {
        const el = sectionRefs.current[id];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (ev.clientY >= rect.top && ev.clientY < rect.bottom) {
          overSection = id;
          break;
        }
      }
      setDragOverSection(overSection !== sectionId ? overSection : null);
    };

    const onUp = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);

      // Find drop target
      let targetId: string | null = null;
      for (const id of sectionOrder) {
        const el = sectionRefs.current[id];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (ev.clientY >= rect.top && ev.clientY < rect.bottom) {
          targetId = id;
          break;
        }
      }

      if (targetId && targetId !== sectionId) {
        const order = [...sectionOrder];
        const fromIdx = order.indexOf(sectionId);
        const toIdx = order.indexOf(targetId);
        if (fromIdx !== -1 && toIdx !== -1) {
          order.splice(fromIdx, 1);
          order.splice(toIdx, 0, sectionId);
          updateSettings({ sidebar_section_order: order });
        }
      }

      setDragSection(null);
      setDragOverSection(null);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
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

  // Section renderers
  const makeDragProps = (id: string) => ({
    onPointerDown: (e: React.PointerEvent) => handleSectionPointerDown(id, e),
    dragOver: dragOverSection === id,
    dragging: dragSection === id,
  });

  const sections: Record<string, () => React.ReactNode> = {
    sources: () => (
      <div key="sources" ref={(el) => { sectionRefs.current['sources'] = el; }}>
        <SectionLabel text="Sources" collapsed={collapsed.sources} onToggle={() => toggleCollapsed('sources')} {...makeDragProps('sources')} />
        {!collapsed.sources && drives.filter((d) => !d.is_cloud).map((d) => (
          <div key={d.letter} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <div style={{ flex: 1 }}>
              <FolderTreeItem
                path={d.letter}
                label={d.label}
                icon={<DriveIcon type={d.drive_type} />}
                depth={0}
                onNavigate={navigate}
              />
            </div>
            {d.drive_type === 'removable' && (
              <button
                onClick={(e) => { e.stopPropagation(); ejectDrive(d.letter); }}
                title="Eject"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--t3)', padding: '2px 8px', display: 'flex', alignItems: 'center',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--yellow)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <polyline points="3,2 6,8 9,2" />
                  <line x1="3" y1="10" x2="9" y2="10" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    ),
    cloud: () => (
      <div key="cloud" ref={(el) => { sectionRefs.current['cloud'] = el; }}>
        <SectionLabel text="Cloud" collapsed={collapsed.cloud} onToggle={() => toggleCollapsed('cloud')} {...makeDragProps('cloud')} />
        {!collapsed.cloud && <CloudSources />}
      </div>
    ),
    'quick-access': () => (
      <div key="quick-access" ref={(el) => { sectionRefs.current['quick-access'] = el; }}>
        <SectionLabel text="Quick Access" collapsed={collapsed['quick-access']} onToggle={() => toggleCollapsed('quick-access')} {...makeDragProps('quick-access')} />
        {!collapsed['quick-access'] && (
          <>
            {quickAccessDefaults.map((qa) => (
              <FolderTreeItem
                key={qa.path}
                path={qa.path}
                label={qa.label}
                icon={<FileIcon entry={{ name: qa.label, path: qa.path, is_dir: true, is_hidden: false, is_symlink: false, size: 0, modified: '', created: '', extension: null, readonly: false, children_count: null }} size={14} />}
                depth={0}
                onNavigate={navigate}
              />
            ))}
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
      </div>
    ),
    git: () => (
      <div key="git" ref={(el) => { sectionRefs.current['git'] = el; }}>
        <SectionLabel
          text={isGitRepo ? 'Git' : 'Git (no repo)'}
          collapsed={!isGitRepo || collapsed.git}
          onToggle={isGitRepo ? () => toggleCollapsed('git') : undefined}
          {...makeDragProps('git')}
        />
        {isGitRepo && !collapsed.git && <GitPanel />}
      </div>
    ),
  };

  return (
    <div
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        background: 'var(--sidebar-bg, var(--surface))',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        {sectionOrder.map((id) => sections[id]?.())}
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
