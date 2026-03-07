import { useEffect, useRef } from 'react';
import type { FileEntry } from '../../types';

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
}

interface MenuItem {
  label: string;
  action: () => void;
  separator?: boolean;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
}

export function ContextMenu({ x, y, entry, onClose, onOpen, onCopyPath, onRefresh, onNewTerminal, onPreviewInTab, onPinToQuickAccess, isPinned, onGitStage, onGitDiscard, gitFileStatus, onCut, onCopy, onPaste, canPaste }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
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
    items.push({ label: '', action: () => {}, separator: true });
  }

  items.push({ label: 'Refresh', shortcut: 'F5', action: () => { onRefresh(); onClose(); } });

  const menuWidth = 220;
  const menuHeight = items.length * 32;
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

  return (
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
            onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = 'var(--hover)'; }}
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
    </div>
  );
}
