import { FileIcon } from '../common/FileIcon';
import { InlineRename } from './InlineRename';
import { useSettingsStore } from '../../stores/settings';
import type { FileEntry } from '../../types';

interface TilesViewProps {
  entries: FileEntry[];
  selectedPaths: Set<string>;
  onRowClick: (entry: FileEntry, idx: number, e: React.MouseEvent) => void;
  onDoubleClick: (entry: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  renamingPath?: string | null;
  onRenameDone?: (newName: string | null) => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '--';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(); } catch { return ''; }
}

export function TilesView({ entries, selectedPaths, onRowClick, onDoubleClick, onContextMenu, renamingPath, onRenameDone }: TilesViewProps) {
  const s = (useSettingsStore((st) => st.settings.icon_scale) || 100) / 100;
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 6, padding: 12,
      flex: 1, overflowY: 'auto', alignContent: 'flex-start',
    }}>
      {entries.map((entry, idx) => {
        const selected = selectedPaths.has(entry.path);
        return (
          <div
            key={entry.path}
            data-filepath={entry.path}
            onClick={(e) => onRowClick(entry, idx, e)}
            onDoubleClick={() => onDoubleClick(entry)}
            onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, entry); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: 260, maxWidth: '100%', padding: '8px 12px',
              borderRadius: 6, cursor: 'pointer', userSelect: 'none',
              background: selected ? 'var(--active)' : 'transparent',
              border: selected ? '1px solid var(--accent)' : '1px solid transparent',
              contentVisibility: 'auto',
              containIntrinsicSize: 'auto 260px auto 62px',
            } as React.CSSProperties}
            onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
          >
            <FileIcon entry={entry} size={Math.round(36 * s)} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {renamingPath === entry.path && onRenameDone ? (
                <InlineRename
                  entry={entry}
                  onDone={onRenameDone}
                  style={{ flex: 'none', width: '100%', fontFamily: 'inherit' }}
                />
              ) : (
                <div style={{
                  fontSize: 12, fontWeight: 500, color: 'var(--t1)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {entry.name}
                </div>
              )}
              <div style={{ fontSize: 10, color: 'var(--t3)', lineHeight: 1.6 }}>
                {entry.is_dir ? 'Folder' : `${(entry.extension || '').toUpperCase()} File`}
                {!entry.is_dir && ` — ${formatSize(entry.size)}`}
              </div>
              <div style={{ fontSize: 10, color: 'var(--t3)' }}>
                {formatDate(entry.modified)}
              </div>
            </div>
          </div>
        );
      })}
      {entries.length === 0 && (
        <div style={{ padding: 24, color: 'var(--t3)', width: '100%', textAlign: 'center' }}>Empty directory</div>
      )}
    </div>
  );
}
