import { usePanelsStore } from '../../stores/panels';
import { useLayoutStore } from '../../stores/layout';
import type { Tab } from '../../types';

function IconFolder() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--yellow)" stroke="none">
      <path d="M1.5 3a1 1 0 011-1H6l1.5 1.5H13.5a1 1 0 011 1V13a1 1 0 01-1 1h-12a1 1 0 01-1-1V3z" />
    </svg>
  );
}

function IconTerminal() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--green)" strokeWidth="1.5">
      <polyline points="4,4 8,8 4,12" />
      <line x1="9" y1="12" x2="13" y2="12" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="2" y1="2" x2="8" y2="8" />
      <line x1="8" y1="2" x2="2" y2="8" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="6" y1="1" x2="6" y2="11" />
      <line x1="1" y1="6" x2="11" y2="6" />
    </svg>
  );
}

function IconPreview() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5">
      <circle cx="8" cy="8" r="5" />
      <circle cx="8" cy="8" r="2" fill="var(--accent)" stroke="none" />
    </svg>
  );
}

function IconSplitH() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="0.5" y="1" width="11" height="10" rx="1" />
      <line x1="6" y1="1" x2="6" y2="11" />
    </svg>
  );
}

function IconSplitV() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="0.5" y="1" width="11" height="10" rx="1" />
      <line x1="0.5" y1="6" x2="11.5" y2="6" />
    </svg>
  );
}

function PanelTabItem({ tab, panelId }: { tab: Tab; panelId: string }) {
  const { setActiveTab, closeTab } = usePanelsStore();
  const focusPanel = usePanelsStore((s) => s.focusPanel);
  const activeTabId = usePanelsStore((s) => s.panels[panelId]?.activeTabId);
  const isActive = tab.id === activeTabId;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/panel-tab', JSON.stringify({ panelId, tabId: tab.id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => { setActiveTab(panelId, tab.id); focusPanel(panelId); }}
      onMouseDown={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          closeTab(panelId, tab.id);
        }
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px',
        height: '100%', cursor: 'pointer',
        background: isActive ? 'var(--base)' : 'transparent',
        borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        color: isActive ? 'var(--t1)' : 'var(--t2)',
        fontSize: 12, whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--hover)'; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      {tab.type === 'explorer' ? <IconFolder /> : tab.type === 'terminal' ? <IconTerminal /> : <IconPreview />}
      <span>{tab.title}</span>
      {!tab.pinned && (
        <div
          onClick={(e) => { e.stopPropagation(); closeTab(panelId, tab.id); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 16, height: 16, borderRadius: 3, color: 'var(--t3)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--active)'; e.currentTarget.style.color = 'var(--t1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
        >
          <IconX />
        </div>
      )}
    </div>
  );
}

interface Props {
  panelId: string;
}

export function PanelTabBar({ panelId }: Props) {
  const panel = usePanelsStore((s) => s.panels[panelId]);
  const { addTab, focusPanel } = usePanelsStore();
  const splitPanel = useLayoutStore((s) => s.splitPanel);
  const focusedPanelId = usePanelsStore((s) => s.focusedPanelId);
  const isFocused = focusedPanelId === panelId;

  const tabs = panel?.tabs || [];

  const handleNewExplorer = () => {
    addTab(panelId, {
      id: crypto.randomUUID(), type: 'explorer', title: 'Explorer', path: 'C:\\', pinned: false,
    });
  };

  const handleNewTerminal = () => {
    addTab(panelId, {
      id: crypto.randomUUID(), type: 'terminal', title: 'Terminal', pinned: false,
    });
  };

  const handleSplitH = () => {
    const newPanelId = `panel-${crypto.randomUUID().slice(0, 8)}`;
    usePanelsStore.getState().createPanel(newPanelId, [
      { id: crypto.randomUUID(), type: 'explorer', title: 'Explorer', path: 'C:\\', pinned: false },
    ]);
    splitPanel(panelId, 'horizontal', newPanelId);
  };

  const handleSplitV = () => {
    const newPanelId = `panel-${crypto.randomUUID().slice(0, 8)}`;
    usePanelsStore.getState().createPanel(newPanelId, [
      { id: crypto.randomUUID(), type: 'explorer', title: 'Explorer', path: 'C:\\', pinned: false },
    ]);
    splitPanel(panelId, 'vertical', newPanelId);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/panel-tab');
    if (!data) return;
    try {
      const { panelId: fromPanel, tabId } = JSON.parse(data);
      if (fromPanel !== panelId) {
        usePanelsStore.getState().moveTabToPanel(fromPanel, tabId, panelId);
      }
    } catch {}
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/panel-tab')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const smallBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: '100%', border: 'none', background: 'transparent',
    color: 'var(--t3)', cursor: 'pointer',
  };

  return (
    <div
      onClick={() => focusPanel(panelId)}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{
        height: 32, minHeight: 32, background: 'var(--deep)',
        display: 'flex', alignItems: 'stretch',
        borderBottom: isFocused ? '1px solid var(--accent)' : '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, overflow: 'hidden' }}>
        {tabs.map((tab) => (
          <PanelTabItem key={tab.id} tab={tab} panelId={panelId} />
        ))}
      </div>
      <button onClick={handleNewExplorer} style={smallBtn} title="New explorer tab"
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; }}
      >
        <IconPlus />
      </button>
      <button onClick={handleNewTerminal} style={smallBtn} title="New terminal (Ctrl+Shift+T)"
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--green)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; }}
      >
        <IconTerminal />
      </button>
      <button onClick={handleSplitH} style={smallBtn} title="Split right (Ctrl+Shift+D)"
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; }}
      >
        <IconSplitH />
      </button>
      <button onClick={handleSplitV} style={smallBtn} title="Split down (Ctrl+Shift+S)"
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; }}
      >
        <IconSplitV />
      </button>
    </div>
  );
}
