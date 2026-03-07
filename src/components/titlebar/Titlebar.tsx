import { getCurrentWindow } from '@tauri-apps/api/window';
import { useLayoutStore } from '../../stores/layout';

const appWindow = getCurrentWindow();

function IconSidebar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="2" width="14" height="12" rx="1.5" />
      <line x1="5.5" y1="2" x2="5.5" y2="14" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
    </svg>
  );
}

function IconMinimize() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <rect x="2" y="5.5" width="8" height="1" />
    </svg>
  );
}

function IconMaximize() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="2" y="2" width="8" height="8" rx="1" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="3" y1="3" x2="9" y2="9" />
      <line x1="9" y1="3" x2="3" y2="9" />
    </svg>
  );
}

const btnBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 40,
  border: 'none',
  background: 'transparent',
  color: 'var(--t2)',
  cursor: 'pointer',
};

interface Props {
  onOpenSettings: () => void;
}

export function Titlebar({ onOpenSettings }: Props) {
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);

  return (
    <div
      data-tauri-drag-region
      style={{
        height: 40,
        minHeight: 40,
        background: 'var(--deepest)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Left: app title */}
      <div
        data-tauri-drag-region
        style={{ display: 'flex', alignItems: 'center', paddingLeft: 12, gap: 8 }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
          .files
        </span>
      </div>

      {/* Center: drag region spacer */}
      <div data-tauri-drag-region style={{ flex: 1 }} />

      {/* Right: action buttons + window controls */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          style={btnBase}
          onClick={toggleSidebar}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Toggle Sidebar (Ctrl+B)"
        >
          <IconSidebar />
        </button>
        <button
          style={btnBase}
          onClick={onOpenSettings}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Settings (Ctrl+,)"
        >
          <IconGear />
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />

        <button
          style={btnBase}
          onClick={() => appWindow.minimize()}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Minimize"
        >
          <IconMinimize />
        </button>
        <button
          style={btnBase}
          onClick={() => appWindow.toggleMaximize()}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Maximize"
        >
          <IconMaximize />
        </button>
        <button
          style={{ ...btnBase, width: 42 }}
          onClick={() => appWindow.close()}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--red)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--t2)';
          }}
          title="Close"
        >
          <IconClose />
        </button>
      </div>
    </div>
  );
}
