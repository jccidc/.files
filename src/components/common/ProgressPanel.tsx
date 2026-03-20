import { useEffect, useState } from 'react';

interface ActiveOp {
  opId: string;
  currentFile: string;
  filesDone: number;
  filesTotal: number;
  bytesDone: number;
  bytesTotal: number;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

export function ProgressPanel() {
  const [ops, setOps] = useState<Map<string, ActiveOp>>(new Map());

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    import('../../api/fileOps').then(({ onFileOpProgress }) => {
      onFileOpProgress((progress) => {
        setOps((prev) => {
          const next = new Map(prev);
          if (progress.files_done >= progress.files_total && progress.files_total > 0) {
            // Operation complete — remove after a short delay
            setTimeout(() => {
              setOps((p) => { const n = new Map(p); n.delete(progress.op_id); return n; });
            }, 1500);
          }
          next.set(progress.op_id, {
            opId: progress.op_id,
            currentFile: progress.current_file,
            filesDone: progress.files_done,
            filesTotal: progress.files_total,
            bytesDone: progress.bytes_done,
            bytesTotal: progress.bytes_total,
          });
          return next;
        });
      }).then((fn) => { unlisten = fn; });
    });
    return () => { if (unlisten) unlisten(); };
  }, []);

  if (ops.size === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 32, right: 16, zIndex: 1500,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 360,
    }}>
      {[...ops.values()].map((op) => {
        const pct = op.filesTotal > 0 ? Math.round((op.filesDone / op.filesTotal) * 100) : 0;
        const done = pct >= 100;
        return (
          <div key={op.opId} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t2)', marginBottom: 6 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                {done ? 'Complete' : op.currentFile || 'Preparing...'}
              </span>
              <span>{op.filesDone}/{op.filesTotal} files</span>
            </div>
            <div style={{ height: 4, background: 'var(--deep)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: done ? 'var(--green, #4ade80)' : 'var(--accent)',
                width: `${pct}%`, borderRadius: 2,
                transition: 'width 0.2s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>
              <span>{pct}%</span>
              {op.bytesTotal > 0 && <span>{formatSize(op.bytesDone)} / {formatSize(op.bytesTotal)}</span>}
              {!done && (
                <button
                  onClick={() => { import('../../api/fileOps').then(({ cancelFileOp }) => cancelFileOp(op.opId)); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--red, #f87171)',
                    cursor: 'pointer', fontSize: 10, padding: 0, fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
