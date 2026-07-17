import { useState, useEffect, useRef, useMemo } from 'react';
import { usePanelsStore } from '../../stores/panels';
import { useLayoutStore, DEFAULT_PANEL_ID } from '../../stores/layout';
import { useExplorerStore, useActiveExplorerState } from '../../stores/explorer';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const splitPanel = useLayoutStore((s) => s.splitPanel);
  const { tabId: activeTabId } = useActiveExplorerState();
  const refresh = () => {
    const tid = activeTabId || useExplorerStore.getState().activeTabId;
    if (tid) useExplorerStore.getState().refresh(tid);
  };

  const commands: Command[] = useMemo(
    () => [
      {
        id: 'new-explorer',
        label: 'New Explorer Tab',
        shortcut: 'Ctrl+T',
        action: () => {
          const pid = usePanelsStore.getState().focusedPanelId || DEFAULT_PANEL_ID;
          usePanelsStore.getState().addTab(pid, {
            id: crypto.randomUUID(), type: 'explorer', title: 'Explorer', path: 'C:\\', pinned: false,
          });
          onClose();
        },
      },
      {
        id: 'new-terminal',
        label: 'New Terminal Tab',
        shortcut: 'Ctrl+Shift+T',
        action: () => {
          const pid = usePanelsStore.getState().focusedPanelId || DEFAULT_PANEL_ID;
          usePanelsStore.getState().addTab(pid, {
            id: crypto.randomUUID(), type: 'terminal', title: 'Terminal', pinned: false,
          });
          onClose();
        },
      },
      {
        id: 'split-right',
        label: 'Split Editor Right',
        shortcut: 'Ctrl+Shift+D',
        action: () => {
          const pid = usePanelsStore.getState().focusedPanelId;
          if (!pid) return;
          const newPid = `panel-${crypto.randomUUID().slice(0, 8)}`;
          usePanelsStore.getState().createPanel(newPid, [
            { id: crypto.randomUUID(), type: 'explorer', title: 'Explorer', path: 'C:\\', pinned: false },
          ]);
          splitPanel(pid, 'horizontal', newPid);
          onClose();
        },
      },
      {
        id: 'split-down',
        label: 'Split Editor Down',
        shortcut: 'Ctrl+Shift+S',
        action: () => {
          const pid = usePanelsStore.getState().focusedPanelId;
          if (!pid) return;
          const newPid = `panel-${crypto.randomUUID().slice(0, 8)}`;
          usePanelsStore.getState().createPanel(newPid, [
            { id: crypto.randomUUID(), type: 'explorer', title: 'Explorer', path: 'C:\\', pinned: false },
          ]);
          splitPanel(pid, 'vertical', newPid);
          onClose();
        },
      },
      {
        id: 'toggle-sidebar',
        label: 'Toggle Sidebar',
        shortcut: 'Ctrl+B',
        action: () => {
          toggleSidebar();
          onClose();
        },
      },
      {
        id: 'refresh',
        label: 'Refresh Explorer',
        shortcut: 'F5',
        action: () => {
          refresh();
          onClose();
        },
      },
      {
        id: 'address-bar',
        label: 'Go to Path',
        shortcut: 'Ctrl+L',
        action: () => {
          onClose();
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true }));
        },
      },
    ],
    [toggleSidebar, splitPanel, refresh, onClose],
  );

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [query, commands]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      filtered[selectedIndex].action();
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        display: 'flex', justifyContent: 'center', paddingTop: 80,
        background: 'rgba(0,0,0,0.5)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(480px, 90vw)', maxHeight: 360, background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 8,
          overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <input
          ref={inputRef} value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          style={{
            background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--border)',
            padding: '12px 16px', fontSize: 14, color: 'var(--t1)', outline: 'none',
          }}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              onClick={cmd.action}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 16px', cursor: 'pointer',
                background: i === selectedIndex ? 'var(--active)' : 'transparent',
                color: 'var(--t1)', fontSize: 13,
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span>{cmd.label}</span>
              {cmd.shortcut && (
                <span style={{
                  fontSize: 11, color: 'var(--t3)', background: 'var(--raised)',
                  padding: '2px 6px', borderRadius: 3, fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {cmd.shortcut}
                </span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 16, color: 'var(--t3)', textAlign: 'center', fontSize: 13 }}>
              No matching commands
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
