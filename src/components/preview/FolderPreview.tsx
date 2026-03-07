import { useEffect, useState } from 'react';
import { dirStats, readDir } from '../../api/filesystem';
import type { FileEntry, DirStats } from '../../types';

interface Props {
  entry: FileEntry;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

export function FolderPreview({ entry }: Props) {
  const [stats, setStats] = useState<DirStats | null>(null);
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [childrenLoading, setChildrenLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setStatsLoading(true);
    setChildrenLoading(true);

    readDir(entry.path, true)
      .then((listing) => { if (!cancelled) setChildren(listing.entries); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChildrenLoading(false); });

    dirStats(entry.path)
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setStatsLoading(false); });

    return () => { cancelled = true; };
  }, [entry.path]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
        padding: 16, borderBottom: '1px solid var(--border)',
      }}>
        <StatCard label="Files" value={statsLoading ? '...' : String(stats?.file_count ?? 0)} />
        <StatCard label="Folders" value={statsLoading ? '...' : String(stats?.dir_count ?? 0)} />
        <StatCard
          label="Total Size"
          value={statsLoading ? '...' : formatSize(stats?.total_size ?? 0)}
          note={stats?.truncated ? '(truncated at 100K items)' : undefined}
        />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        <div style={{
          padding: '4px 16px 8px', fontSize: 11, color: 'var(--t3)',
          fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Contents {!childrenLoading && `(${children.length})`}
        </div>
        {childrenLoading && (
          <div style={{ color: 'var(--t3)', padding: '8px 16px', fontSize: 12 }}>Loading...</div>
        )}
        {!childrenLoading && children.map((child) => (
          <div
            key={child.path}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 16px', fontSize: 12, color: 'var(--t2)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {child.is_dir ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--yellow)" stroke="none">
                <path d="M1.5 3a1 1 0 011-1H6l1.5 1.5H13.5a1 1 0 011 1V13a1 1 0 01-1 1h-12a1 1 0 01-1-1V3z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--t3)" strokeWidth="1">
                <path d="M4 1.5h5l3.5 3.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1z" />
              </svg>
            )}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {child.name}
            </span>
            <span style={{ fontSize: 11, color: 'var(--t3)', flexShrink: 0 }}>
              {child.is_dir ? '--' : formatSize(child.size)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{
      background: 'var(--raised)', borderRadius: 6, padding: '10px 14px',
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 10, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--t1)' }}>{value}</div>
      {note && <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>{note}</div>}
    </div>
  );
}
