import { useState, useEffect } from 'react';
import { FileIcon } from '../common/FileIcon';
import type { FileEntry } from '../../types';

interface FlatViewProps {
  rootPath: string;
  onDoubleClick: (entry: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '--';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

export function FlatView({ rootPath, onDoubleClick, onContextMenu }: FlatViewProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    setFiles([]);
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke('search_with_filters', {
        path: rootPath, query: '', fileType: null, minSize: null, maxSize: null,
        modifiedAfter: null, modifiedBefore: null, maxResults: 2000,
      }).then((results: any) => {
        setFiles((results as FileEntry[]).filter((f) => !f.is_dir));
        setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, [rootPath]);

  const rootNorm = rootPath.replace(/\\/g, '/').replace(/\/$/, '');
  const filtered = filter
    ? files.filter((f) => f.name.toLowerCase().includes(filter.toLowerCase()))
    : files;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Filter bar */}
      <div style={{
        padding: '6px 12px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8, background: 'var(--deep)',
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--t3)" strokeWidth="1.5">
          <circle cx="5" cy="5" r="4" /><line x1="8" y1="8" x2="11" y2="11" />
        </svg>
        <input
          type="text"
          placeholder="Filter flat view..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--t1)', fontSize: 12, fontFamily: 'inherit',
          }}
        />
        <span style={{ fontSize: 10, color: 'var(--t3)' }}>{filtered.length} files</span>
      </div>

      {/* File list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && <div style={{ padding: 24, color: 'var(--t3)', textAlign: 'center' }}>Scanning files...</div>}
        {!loading && filtered.map((entry) => {
          const relPath = entry.path.replace(/\\/g, '/').replace(rootNorm + '/', '');
          const dir = relPath.includes('/') ? relPath.replace(/\/[^/]+$/, '') : '';
          return (
            <div
              key={entry.path}
              onDoubleClick={() => onDoubleClick(entry)}
              onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, entry); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 12px', cursor: 'pointer', fontSize: 12,
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <FileIcon entry={entry} size={14} />
              <span style={{ color: 'var(--t1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                {entry.name}
              </span>
              {dir && (
                <span style={{ color: 'var(--t3)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {dir}
                </span>
              )}
              <span style={{ color: 'var(--t3)', fontSize: 10, flexShrink: 0 }}>{formatSize(entry.size)}</span>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: 24, color: 'var(--t3)', textAlign: 'center' }}>No files found</div>
        )}
      </div>
    </div>
  );
}
