import type { FileEntry } from '../../types';
import { FileIcon } from '../common/FileIcon';

function gridDisplayName(entry: FileEntry): string {
  if ((entry.extension || '').toLowerCase() === 'lnk') {
    return entry.name.replace(/\.lnk$/i, '');
  }
  return entry.name;
}

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
  onPointerDragStart: (e: React.PointerEvent, entry: FileEntry) => void;
  onMiddleClick?: (entry: FileEntry) => void;
}

function GridCard({
  entry,
  idx: _idx,
  selected,
  onClick,
  onDoubleClick,
  onContextMenu,
  onPointerDragStart,
  onMiddleClick,
}: {
  entry: FileEntry;
  idx: number;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onPointerDragStart: (e: React.PointerEvent) => void;
  onMiddleClick?: (entry: FileEntry) => void;
}) {
  return (
    <div
      data-drop-folder={entry.is_dir ? entry.path : undefined}
      data-filepath={entry.path}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        if (e.button === 1 && entry.is_dir) { e.preventDefault(); onMiddleClick?.(entry); }
        if (e.button === 2) { e.preventDefault(); e.stopPropagation(); onContextMenu(e); }
      }}
      onPointerDown={(e) => { if (e.button === 0) onPointerDragStart(e); }}
      style={{
        width: 100,
        padding: '10px 6px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        borderRadius: 6,
        cursor: 'pointer', userSelect: 'none',
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
        <FileIcon entry={entry} size={entry.is_dir ? 40 : 36} />
      </div>

      {/* Name */}
      <div style={{
        width: '100%', textAlign: 'center', fontSize: 11,
        color: entry.is_hidden ? 'var(--t3)' : 'var(--t1)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {gridDisplayName(entry)}
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

export function FileGrid({ entries, selectedPaths, onRowClick, onDoubleClick, onContextMenu, onPointerDragStart, onMiddleClick }: FileGridProps) {
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
          onContextMenu={(e) => { e.stopPropagation(); onContextMenu(e, entry); }}
          onPointerDragStart={(e) => onPointerDragStart(e, entry)}
          onMiddleClick={onMiddleClick}
        />
      ))}
      {entries.length === 0 && (
        <div style={{ padding: 24, color: 'var(--t3)', textAlign: 'center', width: '100%' }}>Empty directory</div>
      )}
    </div>
  );
}
