import { createPortal } from 'react-dom';

export interface ConflictInfo {
  source: string;
  target: string;
  source_size: number;
  target_size: number;
  source_modified: string;
  target_modified: string;
}

interface ConflictDialogProps {
  conflicts: ConflictInfo[];
  onResolve: (resolution: 'replace_all' | 'skip_all' | 'rename_all') => void;
  onCancel: () => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function formatDate(iso: string): string {
  if (!iso) return '--';
  try { return new Date(iso).toLocaleString(); } catch { return '--'; }
}

export function ConflictDialog({ conflicts, onResolve, onCancel }: ConflictDialogProps) {
  const first = conflicts[0];
  const fileName = first.source.replace(/.*[\\/]/, '');
  const count = conflicts.length;

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 8, padding: 24, maxWidth: 480, width: '90%',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--t1)', marginBottom: 16 }}>
          {count === 1 ? 'File conflict' : `${count} file conflicts`}
        </div>

        <div style={{
          background: 'var(--deep)', borderRadius: 6, padding: 12, marginBottom: 16,
          fontSize: 12, color: 'var(--t2)', lineHeight: 1.8,
        }}>
          <div style={{ fontWeight: 500, color: 'var(--t1)', marginBottom: 8 }}>{fileName}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ color: 'var(--t3)', fontSize: 10, textTransform: 'uppercase' }}>Source</div>
              <div>{formatSize(first.source_size)}</div>
              <div>{formatDate(first.source_modified)}</div>
            </div>
            <div>
              <div style={{ color: 'var(--t3)', fontSize: 10, textTransform: 'uppercase' }}>Destination</div>
              <div>{formatSize(first.target_size)}</div>
              <div>{formatDate(first.target_modified)}</div>
            </div>
          </div>
          {count > 1 && (
            <div style={{ marginTop: 8, color: 'var(--t3)', fontStyle: 'italic' }}>
              ...and {count - 1} more conflict{count > 2 ? 's' : ''}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={onCancel} style={btnStyle('var(--raised)')}>Cancel</button>
          <button onClick={() => onResolve('skip_all')} style={btnStyle('var(--raised)')}>
            Skip {count > 1 ? 'All' : ''}
          </button>
          <button onClick={() => onResolve('rename_all')} style={btnStyle('var(--raised)')}>
            Keep Both{count > 1 ? ' (All)' : ''}
          </button>
          <button onClick={() => onResolve('replace_all')} style={{
            ...btnStyle('var(--accent)'), color: 'var(--deep)',
          }}>
            Replace {count > 1 ? 'All' : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)',
    background: bg, color: 'var(--t1)', fontSize: 12, cursor: 'pointer',
    fontFamily: 'inherit',
  };
}
