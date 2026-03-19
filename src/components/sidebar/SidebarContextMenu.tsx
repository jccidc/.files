import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface SidebarContextMenuProps {
  x: number;
  y: number;
  path: string;
  isDir: boolean;
  onClose: () => void;
  onOpen: (path: string) => void;
  onOpenInTerminal?: (path: string) => void;
  onCopyPath: (path: string) => void;
  onRename?: (path: string) => void;
  onDelete?: (path: string) => void;
  onPinToggle?: (path: string) => void;
  isPinned?: boolean;
  onProperties?: (path: string) => void;
  onNewFolder?: (parentPath: string) => void;
  onNewTerminal?: (path: string) => void;
  onCompressZip?: (path: string) => void;
}

interface MenuItem {
  label: string;
  action: () => void;
  separator?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

export function SidebarContextMenu({ x, y, path, isDir, onClose, onOpen, onOpenInTerminal, onCopyPath, onRename, onDelete, onPinToggle, isPinned, onProperties, onNewFolder, onNewTerminal, onCompressZip }: SidebarContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
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

  items.push({ label: 'Open', action: () => { onOpen(path); onClose(); } });
  if (isDir && onOpenInTerminal) {
    items.push({ label: 'Open in Terminal', action: () => { onOpenInTerminal(path); onClose(); } });
  }
  items.push({ label: '', action: () => {}, separator: true });

  items.push({ label: 'Copy Path', action: () => { onCopyPath(path); onClose(); } });
  items.push({ label: 'Show in Explorer', action: () => {
    import('../../api/shell').then(({ openInExplorer }) => openInExplorer(path));
    onClose();
  }});

  // Open in Terminal
  if (isDir && onNewTerminal) {
    items.push({ label: 'Open in Terminal', action: () => { onNewTerminal(path); onClose(); } });
  }

  // New Folder
  if (isDir && onNewFolder) {
    items.push({ label: '', action: () => {}, separator: true });
    items.push({ label: 'New Folder', action: () => { onNewFolder(path); onClose(); } });
  }

  // Compress
  if (onCompressZip) {
    items.push({ label: 'Compress to ZIP', action: () => { onCompressZip(path); onClose(); } });
  }

  if (isDir && onPinToggle) {
    items.push({
      label: isPinned ? 'Unpin from Quick Access' : 'Pin to Quick Access',
      action: () => { onPinToggle(path); onClose(); },
    });
  }

  if (onRename || onDelete) {
    items.push({ label: '', action: () => {}, separator: true });
    if (onRename) {
      items.push({ label: 'Rename', action: () => { onRename(path); onClose(); } });
    }
    if (onDelete) {
      items.push({ label: 'Delete', danger: true, action: () => { onDelete(path); onClose(); } });
    }
  }

  // Properties
  if (onProperties) {
    items.push({ label: '', action: () => {}, separator: true });
    items.push({ label: 'Properties', action: () => { onProperties(path); onClose(); } });
  }

  const menuWidth = 200;
  const menuHeight = items.length * 30;
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

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
          <div key={i} style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
        ) : (
          <div
            key={i}
            onClick={item.disabled ? undefined : item.action}
            style={{
              display: 'flex', alignItems: 'center',
              padding: '6px 12px', cursor: item.disabled ? 'default' : 'pointer', fontSize: 12,
              color: item.danger ? 'var(--red)' : 'var(--t1)',
              opacity: item.disabled ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span>{item.label}</span>
          </div>
        ),
      )}
    </div>,
    document.body,
  );
}
