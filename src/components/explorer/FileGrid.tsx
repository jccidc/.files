import type { FileEntry } from '../../types';

function formatSize(bytes: number): string {
  if (bytes === 0) return '--';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

interface FileGridProps {
  entries: FileEntry[];
  selectedPaths: Set<string>;
  onRowClick: (entry: FileEntry, idx: number, e: React.MouseEvent) => void;
  onDoubleClick: (entry: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  onDragStart: (e: React.DragEvent, entry: FileEntry) => void;
}

function GridCard({
  entry,
  idx: _idx,
  selected,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDragStart,
}: {
  entry: FileEntry;
  idx: number;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const ext = (entry.extension || '').toLowerCase();

  return (
    <div
      draggable
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
      style={{
        width: 100,
        padding: '10px 6px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        borderRadius: 6,
        cursor: 'pointer',
        background: selected ? 'var(--active)' : 'transparent',
        border: selected ? '1px solid var(--accent)' : '1px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = 'var(--hover)';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = 'transparent';
      }}
    >
      {/* Icon */}
      <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {entry.is_dir ? (
          <svg width="40" height="40" viewBox="0 0 16 16" fill="var(--yellow)" stroke="none">
            <path d="M1.5 3a1 1 0 011-1H6l1.5 1.5H13.5a1 1 0 011 1V13a1 1 0 01-1 1h-12a1 1 0 01-1-1V3z" />
          </svg>
        ) : (
          <svg width="36" height="36" viewBox="0 0 16 16" fill="none" stroke="var(--t3)" strokeWidth="0.8">
            <path d="M4 1.5h5l3.5 3.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1z" />
            <text
              x="8" y="11" textAnchor="middle" fill="var(--t3)" stroke="none"
              style={{ fontSize: '3.5px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
            >
              {ext.toUpperCase().slice(0, 4)}
            </text>
          </svg>
        )}
      </div>

      {/* Name */}
      <div style={{
        width: '100%', textAlign: 'center', fontSize: 11,
        color: entry.is_hidden ? 'var(--t3)' : 'var(--t1)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {entry.name}
      </div>

      {/* Size */}
      {!entry.is_dir && (
        <div style={{ fontSize: 9, color: 'var(--t3)' }}>
          {formatSize(entry.size)}
        </div>
      )}
    </div>
  );
}

export function FileGrid({ entries, selectedPaths, onRowClick, onDoubleClick, onContextMenu, onDragStart }: FileGridProps) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 12px',
      alignContent: 'flex-start', flex: 1, overflowY: 'auto',
    }}>
      {entries.map((entry, i) => (
        <GridCard
          key={entry.path}
          entry={entry}
          idx={i}
          selected={selectedPaths.has(entry.path)}
          onClick={(e) => onRowClick(entry, i, e)}
          onDoubleClick={() => onDoubleClick(entry)}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, entry); }}
          onDragStart={(e) => onDragStart(e, entry)}
        />
      ))}
      {entries.length === 0 && (
        <div style={{ padding: 24, color: 'var(--t3)', textAlign: 'center', width: '100%' }}>Empty directory</div>
      )}
    </div>
  );
}
