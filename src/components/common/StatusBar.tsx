import { useActiveExplorerState, useExplorerStore } from '../../stores/explorer';
import { useGitStore } from '../../stores/git';

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
  const { currentPath, entries, selectedPaths, viewMode, tabId } = useActiveExplorerState();
  const count = entries.length;
  const selected = selectedPaths.size;
  const setViewMode = (mode: 'list' | 'grid') => {
    if (tabId) useExplorerStore.getState().setViewMode(tabId, mode);
  };

  const repoInfo = useGitStore((s) => s.repoInfo);
  const dirCount = entries.filter((e) => e.is_dir).length;
  const fileCount = count - dirCount;

  const segments = currentPath.replace(/\\/g, '/').split('/').filter(Boolean);
  const folderName = segments[segments.length - 1] || currentPath;

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
      {/* Left: mode + branch + folder name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
        <span style={{ color: 'var(--accent)', fontWeight: 500 }}>Explorer</span>
        {repoInfo?.is_repo && repoInfo.branch && (
          <>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <span style={{ color: 'var(--t3)', fontSize: 10 }}>branch:</span>
              <span style={{ color: 'var(--t1)' }}>{repoInfo.branch}</span>
              {(repoInfo.ahead > 0 || repoInfo.behind > 0) && (
                <span style={{ fontSize: 10 }}>
                  {repoInfo.ahead > 0 && <span style={{ color: 'var(--green)' }}>+{repoInfo.ahead}</span>}
                  {repoInfo.behind > 0 && <span style={{ color: 'var(--red)' }}>-{repoInfo.behind}</span>}
                </span>
              )}
            </span>
          </>
        )}
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {folderName}
        </span>
      </div>

      {/* Right: age legend + counts + view toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
        {/* Age color legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', flexShrink: 0 }} />Today</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block', flexShrink: 0 }} />Week</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--t2)', display: 'inline-block', flexShrink: 0 }} />Month</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--t3)', display: 'inline-block', flexShrink: 0 }} />3mo</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--t3)', opacity: 0.5, display: 'inline-block', flexShrink: 0 }} />Old</span>
        </div>
        <span style={{ color: 'var(--border)' }}>|</span>
        {selected > 0 && <span style={{ color: 'var(--accent)' }}>{selected} selected</span>}
        <span>
          {dirCount > 0 && `${dirCount} folder${dirCount !== 1 ? 's' : ''}`}
          {dirCount > 0 && fileCount > 0 && ', '}
          {fileCount > 0 && `${fileCount} file${fileCount !== 1 ? 's' : ''}`}
          {count === 0 && '0 items'}
        </span>
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
