import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FileEntry, TagId } from '../../types';
import { TAG_TYPES } from '../../types';

interface ContextMenuProps {
  x: number;
  y: number;
  entry: FileEntry | null;
  onClose: () => void;
  onOpen: (entry: FileEntry) => void;
  onCopyPath: (path: string) => void;
  onRefresh: () => void;
  onNewTerminal: (cwd: string) => void;
  onPreviewInTab?: (entry: FileEntry) => void;
  onPinToQuickAccess?: (path: string) => void;
  isPinned?: (path: string) => boolean;
  onGitStage?: (path: string) => void;
  onGitDiscard?: (path: string) => void;
  gitFileStatus?: string | null;
  onCut?: (paths: string[]) => void;
  onCopy?: (paths: string[]) => void;
  onPaste?: () => void;
  canPaste?: boolean;
  selectedCount?: number;
  onProperties?: (path: string) => void;
  onNewFolder?: () => void;
  onNewFile?: () => void;
  onOpenWith?: (path: string) => void;
  onCompress?: (paths: string[], format: string) => void;
  onExtract?: (path: string, dest?: string) => void;
  onCreateShortcut?: (path: string) => void;
  onOpenTerminalHere?: (path: string) => void;
  selectedPaths?: string[];
  onTag?: (paths: string[], tagId: string | null) => void;
  currentTags?: Record<string, string>;
}

interface MenuItem {
  label: string;
  action: () => void;
  separator?: boolean;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  submenu?: { label: string; icon?: string; action: () => void; active?: boolean }[];
}

export function ContextMenu({ x, y, entry, onClose, onOpen, onCopyPath, onRefresh, onNewTerminal, onPreviewInTab, onPinToQuickAccess, isPinned, onGitStage, onGitDiscard, gitFileStatus, onCut, onCopy, onPaste, canPaste, onProperties, onNewFolder, onNewFile, onOpenWith, onCompress, onExtract, onCreateShortcut, onOpenTerminalHere: _onOpenTerminalHere, selectedPaths, onTag, currentTags }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // Right-click outside will re-trigger the menu at new position via onMouseDown;
        // close this instance so the new one can open cleanly
        onClose();
      }
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    // Use requestAnimationFrame to avoid catching the same mousedown that opened us
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', handler);
    });
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [onClose]);

  const items: MenuItem[] = [];

  if (entry) {
    // Open actions
    if (entry.is_dir) {
      items.push({ label: 'Open', action: () => { onOpen(entry); onClose(); } });
      items.push({ label: 'Open in Terminal', action: () => { onNewTerminal(entry.path); onClose(); } });
    } else {
      items.push({ label: 'Open', action: () => { onOpen(entry); onClose(); } });
    }
    if (!entry.is_dir && onPreviewInTab) {
      items.push({ label: 'Preview in Tab', action: () => { onPreviewInTab(entry); onClose(); } });
    }
    // Open With (for files only)
    if (!entry.is_dir && onOpenWith) {
      items.push({ label: 'Open With...', action: () => { onOpenWith(entry.path); onClose(); } });
    }
    items.push({ label: '', action: () => {}, separator: true });

    // Cut / Copy / Paste
    if (onCut) {
      items.push({ label: 'Cut', shortcut: 'Ctrl+X', action: () => { onCut([entry.path]); onClose(); } });
    }
    if (onCopy) {
      items.push({ label: 'Copy', shortcut: 'Ctrl+C', action: () => { onCopy([entry.path]); onClose(); } });
    }
    if (onPaste) {
      items.push({ label: 'Paste', shortcut: 'Ctrl+V', disabled: !canPaste, action: () => { if (canPaste) { onPaste(); onClose(); } } });
    }
    items.push({ label: '', action: () => {}, separator: true });

    // Rename / Delete
    items.push({ label: 'Rename', shortcut: 'F2', action: () => {
      onClose();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }));
    }});
    items.push({ label: 'Delete', shortcut: 'Del', danger: true, action: () => {
      onClose();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    }});
    items.push({ label: '', action: () => {}, separator: true });

    // Path / Explorer / Pin
    items.push({ label: 'Copy Name', action: () => { navigator.clipboard.writeText(entry.name); onClose(); } });
    items.push({ label: 'Copy Path', shortcut: 'Ctrl+Shift+C', action: () => { onCopyPath(entry.path); onClose(); } });
    items.push({ label: 'Show in Explorer', action: () => {
      import('../../api/shell').then(({ openInExplorer }) => openInExplorer(entry.path));
      onClose();
    }});
    if (entry.is_dir && onPinToQuickAccess) {
      const pinned = isPinned?.(entry.path);
      items.push({
        label: pinned ? 'Unpin from Quick Access' : 'Pin to Quick Access',
        action: () => { onPinToQuickAccess(entry.path); onClose(); },
      });
    }

    // Compress / Extract / Create Shortcut
    if (onCompress) {
      const paths = selectedPaths && selectedPaths.length > 1 ? selectedPaths : [entry.path];
      items.push({
        label: 'Compress to...',
        action: () => {},
        submenu: [
          { label: 'ZIP archive', action: () => { onCompress(paths, 'zip'); onClose(); } },
          { label: '7z archive', action: () => { onCompress(paths, '7z'); onClose(); } },
          { label: 'tar.gz archive', action: () => { onCompress(paths, 'tar.gz'); onClose(); } },
        ],
      });
    }
    const archiveExts = ['zip', '7z', 'tar', 'gz', 'tgz', 'bz2', 'tbz2'];
    const ext = (entry.extension || '').toLowerCase();
    const isArchive = !entry.is_dir && archiveExts.includes(ext);
    if (onExtract && isArchive) {
      const stem = entry.name.replace(/\.(tar\.(gz|bz2|xz)|tgz|tbz2|zip|7z|gz|bz2)$/i, '');
      items.push({ label: 'Extract Here', action: () => { onExtract(entry.path, '__current__'); onClose(); } });
      items.push({ label: `Extract to ${stem}/`, action: () => { onExtract(entry.path); onClose(); } });
    }
    if (onCreateShortcut) {
      items.push({ label: 'Create Shortcut', action: () => { onCreateShortcut(entry.path); onClose(); } });
    }

    // Tag as...
    if (onTag) {
      const paths = selectedPaths && selectedPaths.length > 1 ? selectedPaths : [entry.path];
      const norm = entry.path.replace(/\\/g, '/');
      const currentTag = currentTags?.[norm] as TagId | undefined;
      const tagSubmenu: { label: string; icon: string; action: () => void; active: boolean }[] =
        (Object.entries(TAG_TYPES) as [TagId, typeof TAG_TYPES[TagId]][]).map(([id, tag]) => ({
          label: tag.label,
          icon: tag.icon,
          active: currentTag === id,
          action: () => { onTag(paths, id); onClose(); },
        }));
      tagSubmenu.push({
        label: 'Remove Tag',
        icon: '\u2716',
        active: false,
        action: () => { onTag(paths, null); onClose(); },
      });
      items.push({ label: 'Tag as...', action: () => {}, submenu: tagSubmenu });
    }

    // Git actions
    if (gitFileStatus && (onGitStage || onGitDiscard)) {
      items.push({ label: 'Git', action: () => {}, separator: true });
      if (onGitStage) {
        items.push({ label: 'Stage Changes', action: () => { onGitStage(entry.path); onClose(); } });
      }
      if (onGitDiscard && (gitFileStatus === 'modified' || gitFileStatus === 'deleted')) {
        items.push({ label: 'Discard Changes', danger: true, action: () => { onGitDiscard(entry.path); onClose(); } });
      }
    }
    // Properties
    if (onProperties) {
      items.push({ label: '', action: () => {}, separator: true });
      items.push({ label: 'Properties', shortcut: 'Alt+Enter', action: () => { onProperties(entry.path); onClose(); } });
    }

    items.push({ label: '', action: () => {}, separator: true });
  }

  // New items (always available - background or on folder)
  if (onNewFolder || onNewFile) {
    items.push({ label: '', action: () => {}, separator: true });
    if (onNewFolder) {
      items.push({ label: 'New Folder', shortcut: 'Ctrl+Shift+N', action: () => { onNewFolder(); onClose(); } });
    }
    if (onNewFile) {
      items.push({ label: 'New Text File', action: () => { onNewFile(); onClose(); } });
    }
  }

  items.push({ label: 'Refresh', shortcut: 'F5', action: () => { onRefresh(); onClose(); } });

  const [hoveredSubmenu, setHoveredSubmenu] = useState<number | null>(null);

  const menuWidth = 220;
  const menuHeight = items.reduce((h, item) => h + (item.separator ? 9 + (item.label ? 18 : 0) : 32), 8);
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const adjustedY = y + menuHeight > window.innerHeight ? Math.max(0, y - menuHeight) : y;

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed', left: adjustedX, top: adjustedY, zIndex: 1000,
        minWidth: menuWidth, background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i}>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
            {item.label && (
              <div style={{ fontSize: 9, color: 'var(--t3)', padding: '4px 12px 2px', userSelect: 'none' }}>
                {item.label}
              </div>
            )}
          </div>
        ) : item.submenu ? (
          <div
            key={i}
            style={{ position: 'relative' }}
            onMouseEnter={() => setHoveredSubmenu(i)}
            onMouseLeave={() => setHoveredSubmenu(null)}
          >
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--t1)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
              onMouseLeave={(e) => { if (hoveredSubmenu !== i) e.currentTarget.style.background = 'transparent'; }}
            >
              <span>{item.label}</span>
              <span style={{ fontSize: 10, color: 'var(--t3)' }}>{'\u25B6'}</span>
            </div>
            {hoveredSubmenu === i && (
              <div style={{
                position: 'absolute',
                left: adjustedX + menuWidth > window.innerWidth - 180 ? -178 : menuWidth - 2,
                top: -4,
                minWidth: 176, background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                zIndex: 1001,
              }}>
                {item.submenu.map((sub, si) => (
                  <div
                    key={si}
                    onClick={sub.action}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px', cursor: 'pointer', fontSize: 12,
                      color: sub.active ? 'var(--accent)' : sub.label === 'Remove Tag' ? 'var(--red)' : 'var(--t1)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {sub.icon && <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{sub.icon}</span>}
                    <span>{sub.label}</span>
                    {sub.active && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent)' }}>{'\u2713'}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            key={i}
            onClick={item.disabled ? undefined : item.action}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 12px', cursor: item.disabled ? 'default' : 'pointer', fontSize: 12,
              color: item.disabled ? 'var(--t3)' : item.danger ? 'var(--red)' : 'var(--t1)',
              opacity: item.disabled ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = 'var(--hover)'; setHoveredSubmenu(null); }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: "'JetBrains Mono', monospace" }}>
                {item.shortcut}
              </span>
            )}
          </div>
        ),
      )}
    </div>,
    document.body,
  );
}
