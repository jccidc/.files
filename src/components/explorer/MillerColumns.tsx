import { useState, useEffect, useRef } from 'react';
import { FileIcon } from '../common/FileIcon';
import type { FileEntry } from '../../types';

interface MillerColumnsProps {
  initialPath: string;
  onNavigate: (path: string) => void;
  onOpenFile: (entry: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
}

interface Column {
  path: string;
  entries: FileEntry[];
  selectedPath: string | null;
}

export function MillerColumns({ initialPath, onNavigate, onOpenFile, onContextMenu }: MillerColumnsProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build initial columns from the path segments
  useEffect(() => {
    loadColumn(initialPath, 0);
  }, [initialPath]);

  const loadColumn = async (path: string, depth: number) => {
    try {
      const { readDir } = await import('../../api/filesystem');
      const { useSettingsStore } = await import('../../stores/settings');
      const showHidden = useSettingsStore.getState().settings.show_hidden;
      const listing = await readDir(path, showHidden);

      setColumns(prev => {
        const next = prev.slice(0, depth);
        next.push({ path, entries: listing.entries, selectedPath: null });
        return next;
      });

      // Auto-scroll to the right
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
      }, 50);
    } catch {}
  };

  const handleSelect = (entry: FileEntry, colIndex: number) => {
    if (entry.is_dir) {
      // Update selected state for this column
      setColumns(prev => {
        const next = [...prev];
        next[colIndex] = { ...next[colIndex], selectedPath: entry.path };
        // Remove columns to the right
        return next.slice(0, colIndex + 1);
      });
      // Load the next column — DON'T call onNavigate (that resets the whole view)
      loadColumn(entry.path, colIndex + 1);
    } else {
      // Select file, update column state
      setColumns(prev => {
        const next = [...prev];
        next[colIndex] = { ...next[colIndex], selectedPath: entry.path };
        // Remove columns to the right
        return next.slice(0, colIndex + 1);
      });
    }
  };

  const handleDoubleClick = (entry: FileEntry) => {
    if (!entry.is_dir) {
      onOpenFile(entry);
    }
  };

  return (
    <div
      ref={scrollRef}
      style={{
        display: 'flex',
        flex: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        height: '100%',
      }}
    >
      {columns.map((col, colIdx) => (
        <div
          key={col.path}
          style={{
            minWidth: 200,
            maxWidth: 300,
            width: colIdx === columns.length - 1 ? 300 : 220,
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            flexShrink: 0,
            transition: 'width 0.15s ease',
          }}
        >
          {/* Column header */}
          <div style={{
            padding: '6px 10px',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--t3)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: '1px solid var(--border)',
            background: 'var(--deep)',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {col.path.replace(/.*[\\/]/, '') || col.path}
          </div>

          {/* Column entries */}
          {col.entries.map((entry) => {
            const isSelected = col.selectedPath === entry.path;
            return (
              <div
                key={entry.path}
                onClick={() => handleSelect(entry, colIdx)}
                onDoubleClick={() => handleDoubleClick(entry)}
                onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, entry); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: isSelected ? 'var(--t1)' : 'var(--t2)',
                  background: isSelected ? 'var(--active)' : 'transparent',
                  borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--hover)'; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <FileIcon entry={entry} size={14} />
                <span style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {entry.name}
                </span>
                {entry.is_dir && (
                  <svg width="6" height="10" viewBox="0 0 6 10" fill="none" stroke="var(--t3)" strokeWidth="1.5" style={{ flexShrink: 0 }}>
                    <polyline points="1,1 5,5 1,9" />
                  </svg>
                )}
              </div>
            );
          })}

          {col.entries.length === 0 && (
            <div style={{ padding: 12, color: 'var(--t3)', fontSize: 11, textAlign: 'center' }}>Empty</div>
          )}
        </div>
      ))}
    </div>
  );
}
