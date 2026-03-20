import { useEffect, useState, useRef, useCallback } from 'react';
import { useLayoutStore } from '../../stores/layout';
import { useExplorerStore, useActiveExplorerState } from '../../stores/explorer';
import { usePanelsStore } from '../../stores/panels';
import { getDrives, getKnownFolderPaths, readDir } from '../../api/filesystem';
import { useSettingsStore } from '../../stores/settings';
import { useGitStore } from '../../stores/git';
import { FileIcon } from '../common/FileIcon';
import { GitPanel } from './GitPanel';
import { CloudSources } from './CloudSources';
import { SidebarContextMenu } from './SidebarContextMenu';
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
  gap: 'var(--density-gap, 8px)',
  padding: 'var(--density-pad-y, 5px) var(--density-pad-x, 12px)',
  cursor: 'pointer',
  fontSize: 'var(--file-font-size, 13px)',
  color: 'var(--t2)',
  borderRadius: 4,
  margin: '0 6px',
};

// ---- Expandable Folder Tree Item ----

export function FolderTreeItem({ path, label, icon, depth, onNavigate, onContextMenu: onCtxMenu }: {
  path: string; label: string; icon: React.ReactNode; depth: number; onNavigate: (path: string) => void;
  onContextMenu?: (e: React.MouseEvent, path: string) => void;
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
        onDoubleClick={toggle}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => { if (e.button === 2) { e.preventDefault(); e.stopPropagation(); onCtxMenu?.(e, path); } }}
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
        <span
          onClick={(e) => { e.stopPropagation(); toggle(e); }}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px 4px 4px 0', margin: '-4px -4px -4px 0' }}
        >
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
          onContextMenu={onCtxMenu}
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
        fontSize: 'var(--file-font-size-sm, 12px)',
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
  const { currentPath } = useActiveExplorerState();
  const navigate = (path: string) => {
    // Use the focused panel's active tab, not explorer store's activeTabId
    const focusedTab = usePanelsStore.getState().getFocusedActiveTab();
    const tid = focusedTab?.id || useExplorerStore.getState().activeTabId;
    if (tid) useExplorerStore.getState().navigate(tid, path);
  };
  const pinnedPaths = useSettingsStore((s) => s.settings.pinned_paths) || [];
  const updateSettings = useSettingsStore((s) => s.update);
  const ALL_SECTIONS = ['home', 'folders', 'this-pc', 'recents', 'quick-access', 'sources', 'cloud', 'git'];
  const savedOrder = useSettingsStore((s) => s.settings.sidebar_section_order) || [];
  // Merge: keep saved order, prepend any new sections that aren't in the saved list
  const sectionOrder = [
    ...ALL_SECTIONS.filter((s) => !savedOrder.includes(s)),
    ...savedOrder,
  ];
  const isGitRepo = useGitStore((s) => s.repoInfo?.is_repo ?? false);
  const checkRepo = useGitStore((s) => s.checkRepo);

  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [quickAccessDefaults, setQuickAccessDefaults] = useState<{ label: string; path: string }[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragSection, setDragSection] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [sidebarCtx, setSidebarCtx] = useState<{ x: number; y: number; path: string } | null>(null);
  const [dragPinIdx, setDragPinIdx] = useState<number | null>(null);
  const [dragOverPinIdx, setDragOverPinIdx] = useState<number | null>(null);
  const pinRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const resizing = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);
  const dragStartY = useRef(0);

  const lastDriveJson = useRef('');
  const refreshDrives = useCallback(() => {
    getDrives()
      .then((newDrives) => {
        // Only update state if drives actually changed (prevents sidebar re-render blink)
        const json = JSON.stringify(newDrives.map((d) => d.letter + d.label));
        if (json !== lastDriveJson.current) {
          lastDriveJson.current = json;
          setDrives(newDrives);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshDrives();

    getKnownFolderPaths()
      .then((folders) => {
        const defaults = folders.map(([label, path]) => ({ label, path }));
        // Add Pictures, Music, Videos if they exist
        const home = folders.find(([l]) => l === 'Desktop')?.[1]?.replace(/\\Desktop$/, '') || '';
        if (home) {
          for (const extra of ['Pictures', 'Music', 'Videos']) {
            const extraPath = home + '\\' + extra;
            if (!defaults.find((d) => d.label === extra)) {
              defaults.push({ label: extra, path: extraPath });
            }
          }
        }
        setQuickAccessDefaults(defaults);
      })
      .catch(() => {
        const home = 'C:\\Users\\Public';
        setQuickAccessDefaults([
          { label: 'Desktop', path: home + '\\Desktop' },
          { label: 'Documents', path: home + '\\Documents' },
          { label: 'Downloads', path: home + '\\Downloads' },
          { label: 'Pictures', path: home + '\\Pictures' },
          { label: 'Music', path: home + '\\Music' },
          { label: 'Videos', path: home + '\\Videos' },
        ]);
      });

    // Poll for drive changes every 5 seconds (hot-plug detection)
    const interval = setInterval(refreshDrives, 15000);
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

  const handleSidebarContextMenu = (e: React.MouseEvent, path: string) => {
    setSidebarCtx({ x: e.clientX, y: e.clientY, path });
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path).catch(() => {});
  };

  const handlePinPointerDown = (idx: number, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDragPinIdx(idx);

    const onMove = (ev: PointerEvent) => {
      let overIdx: number | null = null;
      for (let i = 0; i < pinnedPaths.length; i++) {
        const el = pinRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (ev.clientY >= rect.top && ev.clientY < rect.bottom) {
          overIdx = i;
          break;
        }
      }
      setDragOverPinIdx(overIdx !== idx ? overIdx : null);
    };

    const onUp = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);

      let targetIdx: number | null = null;
      for (let i = 0; i < pinnedPaths.length; i++) {
        const el = pinRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (ev.clientY >= rect.top && ev.clientY < rect.bottom) {
          targetIdx = i;
          break;
        }
      }

      if (targetIdx !== null && targetIdx !== idx) {
        const order = [...pinnedPaths];
        const [moved] = order.splice(idx, 1);
        order.splice(targetIdx, 0, moved);
        updateSettings({ pinned_paths: order });
      }

      setDragPinIdx(null);
      setDragOverPinIdx(null);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  const handleDeletePath = async (path: string) => {
    try {
      const { deleteToTrash } = await import('../../api/shell');
      await deleteToTrash([path]);
    } catch { /* ignore */ }
  };

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
    home: () => (
      <div key="home" ref={(el) => { sectionRefs.current['home'] = el; }}>
        <div
          onClick={() => {
            const home = quickAccessDefaults.find((q) => q.label === 'Desktop')?.path?.replace(/\\Desktop$/, '') || 'C:\\Users\\Public';
            navigate(home);
          }}
          style={{
            ...itemStyle,
            fontWeight: 500,
            gap: 8,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--t1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.3">
            <path d="M2 8l6-5.5L14 8" /><path d="M3.5 8.5V13.5a1 1 0 001 1h2.5v-3.5h2v3.5h2.5a1 1 0 001-1V8.5" />
          </svg>
          <span>Home</span>
        </div>
      </div>
    ),
    folders: () => {
      const hiddenFolders: string[] = (useSettingsStore.getState().settings as any).hidden_sidebar_folders || [];
      const FolderIcon = ({ label }: { label: string }) => {
        const s = { width: 14, height: 14, flexShrink: 0 as const };
        switch (label) {
          case 'Desktop': return <svg {...s} viewBox="0 0 16 16" fill="none" stroke="var(--cyan)" strokeWidth="1.3"><rect x="1" y="2" width="14" height="9" rx="1.5" /><line x1="5" y1="14" x2="11" y2="14" /><line x1="8" y1="11" x2="8" y2="14" /></svg>;
          case 'Documents': return <svg {...s} viewBox="0 0 16 16" fill="none" stroke="var(--blue, #60a5fa)" strokeWidth="1.3"><path d="M4 1.5h5l4 4V14.5H4V1.5z" /><polyline points="9,1.5 9,5.5 13,5.5" /><line x1="6" y1="8" x2="11" y2="8" /><line x1="6" y1="10.5" x2="11" y2="10.5" /></svg>;
          case 'Downloads': return <svg {...s} viewBox="0 0 16 16" fill="none" stroke="var(--green)" strokeWidth="1.3"><path d="M8 1v8" /><polyline points="5,6 8,9 11,6" /><path d="M2 11v3h12v-3" /></svg>;
          case 'Pictures': return <svg {...s} viewBox="0 0 16 16" fill="none" stroke="var(--purple, #a78bfa)" strokeWidth="1.3"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" /><circle cx="5" cy="6" r="1.5" /><polyline points="1.5,11 5,8 8,11 11,7 14.5,11" /></svg>;
          case 'Music': return <svg {...s} viewBox="0 0 16 16" fill="none" stroke="var(--pink, #f472b6)" strokeWidth="1.3"><path d="M6 12V4l8-2v8" /><circle cx="4" cy="12" r="2" /><circle cx="12" cy="10" r="2" /></svg>;
          case 'Videos': return <svg {...s} viewBox="0 0 16 16" fill="none" stroke="var(--red, #f87171)" strokeWidth="1.3"><rect x="1.5" y="3" width="10" height="10" rx="1.5" /><polygon points="14.5,5 14.5,11 11.5,9 11.5,7" fill="var(--red, #f87171)" /></svg>;
          case 'Recycle Bin': return <svg {...s} viewBox="0 0 16 16" fill="none" stroke="var(--t3)" strokeWidth="1.3"><path d="M3 4h10l-1 10H4L3 4z" /><line x1="1" y1="4" x2="15" y2="4" /><path d="M6 4V2h4v2" /><line x1="6.5" y1="6.5" x2="6.5" y2="12" /><line x1="9.5" y1="6.5" x2="9.5" y2="12" /></svg>;
          default: return <FileIcon entry={{ name: label, path: '', is_dir: true, is_hidden: false, is_symlink: false, size: 0, modified: '', created: '', accessed: '', extension: null, readonly: false, children_count: null }} size={14} />;
        }
      };

      const allFolders = [
        ...quickAccessDefaults,
        { label: 'Recycle Bin', path: 'recycle-bin' },
      ].filter((f) => !hiddenFolders.includes(f.label));

      return (
        <div key="folders" ref={(el) => { sectionRefs.current['folders'] = el; }}>
          {allFolders.map((qa) => (
            <div
              key={qa.path}
              onClick={() => navigate(qa.path)}
              style={{ ...itemStyle, gap: 8 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--t1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; }}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => { if (e.button === 2) { e.preventDefault(); e.stopPropagation(); handleSidebarContextMenu(e, qa.path); } }}
            >
              <FolderIcon label={qa.label} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{qa.label}</span>
            </div>
          ))}
        </div>
      );
    },
    'this-pc': () => (
      <div key="this-pc" ref={(el) => { sectionRefs.current['this-pc'] = el; }}>
        <div
          onClick={() => navigate('this-pc')}
          style={{ ...itemStyle, fontWeight: 500, gap: 8 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--t1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--cyan)" strokeWidth="1.3">
            <rect x="2" y="2" width="12" height="9" rx="1.5" /><line x1="5" y1="14" x2="11" y2="14" /><line x1="8" y1="11" x2="8" y2="14" />
          </svg>
          <span>This PC</span>
        </div>
      </div>
    ),
    recents: () => {
      const RecentsSection = () => {
        const [recentFiles, setRecentFiles] = useState<string[]>([]);
        const [recentFolders, setRecentFolders] = useState<string[]>([]);
        useEffect(() => {
          import('../../stores/recents').then(({ useRecentsStore }) => {
            const state = useRecentsStore.getState();
            setRecentFiles(state.recentFiles.slice(0, 5));
            setRecentFolders(state.recentFolders.slice(0, 5));
            const unsub = useRecentsStore.subscribe((s) => {
              setRecentFiles(s.recentFiles.slice(0, 5));
              setRecentFolders(s.recentFolders.slice(0, 5));
            });
            return () => unsub();
          });
        }, []);

        if (recentFiles.length === 0 && recentFolders.length === 0) return null;

        const getLabel = (p: string) => {
          const segs = p.replace(/\\/g, '/').split('/').filter(Boolean);
          return segs[segs.length - 1] || p;
        };

        return (
          <>
            {recentFolders.map((p) => (
              <div
                key={p}
                onClick={() => navigate(p)}
                style={{ ...itemStyle, gap: 8, paddingLeft: 16 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--t1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; }}
                title={p}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--t3)" stroke="none" style={{ flexShrink: 0, opacity: 0.6 }}>
                  <path d="M1.5 3a1 1 0 011-1H6l1.5 1.5H13.5a1 1 0 011 1V13a1 1 0 01-1 1h-12a1 1 0 01-1-1V3z" />
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getLabel(p)}</span>
              </div>
            ))}
            {recentFiles.map((p) => (
              <div
                key={p}
                onClick={async () => {
                  try {
                    const { openFile } = await import('../../api/shell');
                    await openFile(p);
                  } catch {}
                }}
                style={{ ...itemStyle, gap: 8, paddingLeft: 16 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--t1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; }}
                title={p}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--t3)" strokeWidth="1.3" style={{ flexShrink: 0, opacity: 0.6 }}>
                  <rect x="3" y="1.5" width="10" height="13" rx="1.5" /><line x1="5.5" y1="5" x2="10.5" y2="5" /><line x1="5.5" y1="7.5" x2="10.5" y2="7.5" /><line x1="5.5" y1="10" x2="8.5" y2="10" />
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getLabel(p)}</span>
              </div>
            ))}
          </>
        );
      };

      return (
        <div key="recents" ref={(el) => { sectionRefs.current['recents'] = el; }}>
          <SectionLabel text="Recent" collapsed={collapsed.recents} onToggle={() => toggleCollapsed('recents')} {...makeDragProps('recents')} />
          {!collapsed.recents && <RecentsSection />}
        </div>
      );
    },
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
                onContextMenu={handleSidebarContextMenu}
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
        {!collapsed.cloud && <CloudSources onContextMenu={handleSidebarContextMenu} />}
      </div>
    ),
    'quick-access': () => (
      <div key="quick-access" ref={(el) => { sectionRefs.current['quick-access'] = el; }}>
        <SectionLabel text="Quick Access" collapsed={collapsed['quick-access']} onToggle={() => toggleCollapsed('quick-access')} {...makeDragProps('quick-access')} />
        {!collapsed['quick-access'] && (
          <>
            {pinnedPaths.length === 0 && (
              <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--t3)', fontStyle: 'italic' }}>
                Right-click folders to pin here
              </div>
            )}
            {pinnedPaths.map((p, idx) => (
              <div
                key={p}
                ref={(el) => { pinRefs.current[idx] = el; }}
                style={{
                  display: 'flex', alignItems: 'center', margin: '0 6px', borderRadius: 4,
                  opacity: dragPinIdx === idx ? 0.5 : 1,
                  borderTop: dragOverPinIdx === idx ? '2px solid var(--accent)' : '2px solid transparent',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                onContextMenu={(e) => e.preventDefault()}
                onMouseDown={(e) => { if (e.button === 2) { e.preventDefault(); e.stopPropagation(); handleSidebarContextMenu(e, p); } }}
              >
                <span
                  onPointerDown={(e) => handlePinPointerDown(idx, e)}
                  style={{ cursor: 'grab', display: 'flex', alignItems: 'center', padding: '0 2px 0 8px', touchAction: 'none', flexShrink: 0 }}
                >
                  <IconDrag />
                </span>
                <div
                  onClick={() => navigate(p)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 4px', cursor: 'pointer', fontSize: 'var(--file-font-size, 13px)', color: 'var(--t2)',
                    overflow: 'hidden',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--accent)" stroke="none" style={{ flexShrink: 0 }}>
                    <path d="M1.5 3a1 1 0 011-1H6l1.5 1.5H13.5a1 1 0 011 1V13a1 1 0 01-1 1h-12a1 1 0 01-1-1V3z" />
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
                    color: 'var(--t3)', padding: '2px 6px', fontSize: 'var(--file-font-size-sm, 12px)', borderRadius: 3,
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
      data-sidebar
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

      {/* Sidebar context menu */}
      {sidebarCtx && (
        <SidebarContextMenu
          x={sidebarCtx.x}
          y={sidebarCtx.y}
          path={sidebarCtx.path}
          isDir={true}
          onClose={() => setSidebarCtx(null)}
          onOpen={(p) => navigate(p)}
          onCopyPath={handleCopyPath}
          onDelete={handleDeletePath}
          onPinToggle={(p) => {
            const current = pinnedPaths || [];
            if (current.includes(p)) {
              updateSettings({ pinned_paths: current.filter((pp) => pp !== p) });
            } else {
              updateSettings({ pinned_paths: [...current, p] });
            }
          }}
          isPinned={(pinnedPaths || []).includes(sidebarCtx.path)}
          onNewTerminal={(cwd) => {
            const state = usePanelsStore.getState();
            const focusedPanelId = state.focusedPanelId || Object.keys(state.panels)[0];
            if (focusedPanelId) {
              state.addTab(focusedPanelId, {
                id: crypto.randomUUID(), type: 'terminal', title: 'Terminal', path: cwd, pinned: false,
              });
            }
          }}
          onProperties={async (p) => {
            try {
              const { showProperties } = await import('../../api/shell');
              showProperties(p);
            } catch {}
          }}
          onNewFolder={async (parentPath) => {
            try {
              const { createFolder } = await import('../../api/filesystem');
              await createFolder(parentPath, 'New folder');
            } catch {}
          }}
          onCompress={async (p, format) => {
            try {
              const { compressArchive } = await import('../../api/archive');
              const name = p.replace(/.*[\\/]/, '');
              const parent = p.replace(/[\\/][^\\/]+$/, '');
              const ext = format === '7z' ? '.7z' : '.zip';
              const destPath = parent + '\\' + name + ext;
              await compressArchive([p], destPath, format);
            } catch {}
          }}
        />
      )}
    </div>
  );
}
