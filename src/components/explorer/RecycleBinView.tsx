import { useState, useEffect } from 'react';
import { listRecycleBin, emptyRecycleBin, restoreFromBin } from '../../api/extras';
import { useVirtualScroll } from '../../hooks/useVirtualScroll';

function formatSize(bytes: number): string {
  if (!bytes || isNaN(bytes)) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

const ROW_HEIGHT = 28;

export function RecycleBinView({ onNavigate: _onNavigate }: { onNavigate: (path: string) => void }) {
  const [items, setItems] = useState<{ name: string; path: string; size: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; name: string } | null>(null);

  const refresh = () => {
    setLoading(true);
    listRecycleBin().then((rows) => {
      setItems(rows.map(([name, path, size]) => ({ name, path, size: parseInt(size) || 0 })));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const handleEmpty = async () => {
    if (!confirm('Permanently delete all items in the Recycle Bin?')) return;
    await emptyRecycleBin();
    refresh();
  };

  const handleRestore = async (name: string) => {
    await restoreFromBin(name);
    refresh();
  };

  const handleRestoreSelected = async () => {
    try {
      for (const name of selected) {
        await restoreFromBin(name);
      }
    } finally {
      setSelected(new Set());
      refresh();
    }
  };

  const handleRowClick = (name: string, e: React.MouseEvent) => {
    if (e.ctrlKey) {
      setSelected(prev => {
        const next = new Set(prev);
        next.has(name) ? next.delete(name) : next.add(name);
        return next;
      });
    } else {
      setSelected(new Set([name]));
    }
  };

  const handleRowMouseDown = (name: string, e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();
      if (!selected.has(name)) setSelected(new Set([name]));
      setCtxMenu({ x: e.clientX, y: e.clientY, name });
    }
  };

  const totalSize = items.reduce((sum, i) => sum + i.size, 0);

  const { startIndex, endIndex, totalHeight, offsetY, containerRef, onScroll } =
    useVirtualScroll(items.length, ROW_HEIGHT);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      onClick={() => setCtxMenu(null)}
    >
      {/* Header */}
      <div style={{
        padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="28" height="28" viewBox="0 0 16 16" fill="none" stroke="var(--t2)" strokeWidth="1.3">
            <path d="M3 4h10l-1 10H4L3 4z" />
            <line x1="1" y1="4" x2="15" y2="4" />
            <path d="M6 4V2h4v2" />
            <line x1="6.5" y1="6.5" x2="6.5" y2="12" />
            <line x1="9.5" y1="6.5" x2="9.5" y2="12" />
          </svg>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--t1)' }}>Recycle Bin</div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>
              {items.length} item{items.length !== 1 ? 's' : ''} &middot; {formatSize(totalSize)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {selected.size > 0 && (
            <button onClick={handleRestoreSelected} style={{
              background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4,
              padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
            }}>
              Restore ({selected.size})
            </button>
          )}
          <button onClick={handleEmpty} disabled={items.length === 0} style={{
            background: items.length > 0 ? 'var(--red)' : 'var(--surface)', color: items.length > 0 ? '#fff' : 'var(--t3)',
            border: 'none', borderRadius: 4, padding: '6px 14px', cursor: items.length > 0 ? 'pointer' : 'default',
            fontSize: 12, fontWeight: 500,
          }}>
            Empty Recycle Bin
          </button>
          <button onClick={refresh} style={{
            background: 'var(--surface)', color: 'var(--t2)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 12,
          }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 100px',
        padding: '6px 24px', borderBottom: '1px solid var(--border)',
        fontSize: 11, color: 'var(--t3)', fontWeight: 500, flexShrink: 0,
      }}>
        <span>Name</span>
        <span style={{ textAlign: 'right' }}>Size</span>
      </div>

      {/* Items */}
      <div ref={containerRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
        {loading && <div style={{ padding: 24, color: 'var(--t3)', textAlign: 'center' }}>Loading...</div>}
        {!loading && items.length === 0 && (
          <div style={{ padding: 48, color: 'var(--t3)', textAlign: 'center' }}>
            Recycle Bin is empty
          </div>
        )}
        {!loading && items.length > 0 && (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {items.slice(startIndex, endIndex).map((item) => (
                <div key={item.path}
                  onClick={(e) => handleRowClick(item.name, e)}
                  onMouseDown={(e) => handleRowMouseDown(item.name, e)}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px', alignItems: 'center',
                    height: ROW_HEIGHT, borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', userSelect: 'none', fontSize: 12,
                    background: selected.has(item.name) ? 'var(--active)' : 'transparent',
                    borderRadius: 3,
                  }}
                  onMouseEnter={(e) => { if (!selected.has(item.name)) e.currentTarget.style.background = 'var(--hover)'; }}
                  onMouseLeave={(e) => { if (!selected.has(item.name)) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ color: 'var(--t1)', paddingLeft: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  <span style={{ color: 'var(--t3)', textAlign: 'right', paddingRight: 4 }}>{formatSize(item.size)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <div style={{
          position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 9999,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
          padding: '4px 0', minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            onClick={() => { handleRestore(ctxMenu.name); setCtxMenu(null); }}
            style={{ padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--t1)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Restore
          </div>
          {selected.size > 1 && (
            <div
              onClick={() => { handleRestoreSelected(); setCtxMenu(null); }}
              style={{ padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--t1)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Restore All Selected ({selected.size})
            </div>
          )}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <div
            onClick={() => { handleEmpty(); setCtxMenu(null); }}
            style={{ padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--red)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Empty Recycle Bin
          </div>
        </div>
      )}
    </div>
  );
}
