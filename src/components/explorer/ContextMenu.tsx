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
}

interface MenuItem {
  label: string;
  action: () => void;
  separator?: boolean;
  shortcut?: string;
  danger?: boolean;
}

export function ContextMenu({ x, y, entry, onClose, onOpen, onCopyPath, onRefresh, onNewTerminal, onPreviewInTab }: ContextMenuProps) {
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
    if (entry.is_dir) {
      items.push({ label: 'Open', action: () => { onOpen(entry); onClose(); } });
      items.push({ label: 'Open in Terminal', action: () => { onNewTerminal(entry.path); onClose(); } });
    } else {
      items.push({ label: 'Open', action: () => { onOpen(entry); onClose(); } });
    }
    items.push({ label: 'Show in Explorer', action: () => {
      import('../../api/shell').then(({ openInExplorer }) => openInExplorer(entry.path));
      onClose();
    }});
    if (!entry.is_dir && onPreviewInTab) {
      items.push({ label: 'Preview in Tab', action: () => { onPreviewInTab(entry); onClose(); } });
    }
    items.push({ label: 'Copy Path', shortcut: 'Ctrl+Shift+C', action: () => { onCopyPath(entry.path); onClose(); } });
    items.push({ label: '', action: () => {}, separator: true });
    items.push({ label: 'Rename', shortcut: 'F2', action: () => {
      onClose();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }));
    }});
    items.push({ label: 'Delete', shortcut: 'Del', danger: true, action: () => {
      onClose();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    }});
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
          <div key={i} style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
        ) : (
          <div
            key={i}
            onClick={item.action}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 12px', cursor: 'pointer', fontSize: 12,
              color: item.danger ? 'var(--red)' : 'var(--t1)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
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
