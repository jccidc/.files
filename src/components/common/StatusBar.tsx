import { useExplorerStore } from '../../stores/explorer';

function IconList() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
      <line x1="1" y1="3" x2="13" y2="3" /><line x1="1" y1="7" x2="13" y2="7" /><line x1="1" y1="11" x2="13" y2="11" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="1" y="1" width="5" height="5" rx="0.5" /><rect x="8" y="1" width="5" height="5" rx="0.5" />
      <rect x="1" y="8" width="5" height="5" rx="0.5" /><rect x="8" y="8" width="5" height="5" rx="0.5" />
    </svg>
  );
}

export function StatusBar() {
  const currentPath = useExplorerStore((s) => s.currentPath);
  const count = useExplorerStore((s) => s.entries.length);
  const selected = useExplorerStore((s) => s.selectedPaths.size);
  const viewMode = useExplorerStore((s) => s.viewMode);
  const setViewMode = useExplorerStore((s) => s.setViewMode);

  const btnStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 18, border: 'none', borderRadius: 3, cursor: 'pointer',
    background: active ? 'var(--active)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--t3)',
  });

  return (
    <div style={{
      height: 24, minHeight: 24, background: 'var(--deepest)',
      borderTop: '1px solid var(--border)', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px', fontSize: 11, color: 'var(--t3)', userSelect: 'none',
    }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {currentPath}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
        {selected > 0 && <span style={{ color: 'var(--accent)' }}>{selected} selected</span>}
        <span>{count} item{count !== 1 ? 's' : ''}</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button style={btnStyle(viewMode === 'list')} onClick={() => setViewMode('list')} title="List view">
            <IconList />
          </button>
          <button style={btnStyle(viewMode === 'grid')} onClick={() => setViewMode('grid')} title="Grid view">
            <IconGrid />
          </button>
        </div>
      </div>
    </div>
  );
}
