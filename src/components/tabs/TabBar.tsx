import { useEffect, useRef } from 'react';
import { useTabsStore } from '../../stores/tabs';
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
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="7" y1="2" x2="7" y2="12" />
      <line x1="2" y1="7" x2="12" y2="7" />
    </svg>
  );
}

function TabItem({ tab }: { tab: Tab }) {
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const setActiveTab = useTabsStore((s) => s.setActiveTab);
  const closeTab = useTabsStore((s) => s.closeTab);
  const isActive = tab.id === activeTabId;
  const ref = useRef<HTMLDivElement>(null);

  // Keep the active tab visible when the strip scrolls
  useEffect(() => {
    if (isActive) ref.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [isActive]);

  return (
    <div
      ref={ref}
      onClick={() => setActiveTab(tab.id)}
      onMouseDown={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          closeTab(tab.id);
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 12px',
        height: '100%',
        cursor: 'pointer',
        background: isActive ? 'var(--base)' : 'transparent',
        borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        color: isActive ? 'var(--t1)' : 'var(--t2)',
        fontSize: 12,
        whiteSpace: 'nowrap',
        position: 'relative',
        maxWidth: 180,
        minWidth: 0,
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = 'var(--hover)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      {tab.type === 'explorer' ? <IconFolder /> : <IconTerminal />}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{tab.title}</span>
      {!tab.pinned && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            closeTab(tab.id);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: 4,
            color: 'var(--t3)',
            marginLeft: 2,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--active)';
            e.currentTarget.style.color = 'var(--t1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--t3)';
          }}
        >
          <IconX />
        </div>
      )}
    </div>
  );
}

function IconTerminalSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="4,4 8,8 4,12" />
      <line x1="9" y1="12" x2="13" y2="12" />
    </svg>
  );
}

export function TabBar() {
  const tabs = useTabsStore((s) => s.tabs);
  const addTab = useTabsStore((s) => s.addTab);

  const handleNewExplorer = () => {
    addTab({
      id: crypto.randomUUID(),
      type: 'explorer',
      title: 'Explorer',
      path: 'C:\\',
      pinned: false,
    });
  };

  const handleNewTerminal = () => {
    addTab({
      id: crypto.randomUUID(),
      type: 'terminal',
      title: 'Terminal',
      pinned: false,
    });
  };

  const tabBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: '100%',
    border: 'none',
    background: 'transparent',
    color: 'var(--t3)',
    cursor: 'pointer',
  };

  return (
    <div
      style={{
        height: 36,
        minHeight: 36,
        background: 'var(--deep)',
        display: 'flex',
        alignItems: 'stretch',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none' }}>
        {tabs.map((tab) => (
          <TabItem key={tab.id} tab={tab} />
        ))}
      </div>
      <button
        onClick={handleNewExplorer}
        style={tabBtnStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--hover)';
          e.currentTarget.style.color = 'var(--t1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--t3)';
        }}
        title="New Explorer Tab (Ctrl+T)"
      >
        <IconPlus />
      </button>
      <button
        onClick={handleNewTerminal}
        style={tabBtnStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--hover)';
          e.currentTarget.style.color = 'var(--t1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--t3)';
        }}
        title="New Terminal Tab (Ctrl+Shift+T)"
      >
        <IconTerminalSmall />
      </button>
    </div>
  );
}
