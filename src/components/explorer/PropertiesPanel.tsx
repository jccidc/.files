import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface FileProps {
  path: string;
  name: string;
  is_dir: boolean;
  size: number;
  file_count: number | null;
  dir_count: number | null;
  created: string;
  modified: string;
  accessed: string;
  readonly: boolean;
  hidden: boolean;
  system: boolean;
  extension: string | null;
}

interface DirStats {
  file_count: number;
  dir_count: number;
  total_size: number;
  truncated: boolean;
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

interface PropertiesPanelProps {
  path: string;
  onClose: () => void;
}

export function PropertiesPanel({ path, onClose }: PropertiesPanelProps) {
  const [props, setProps] = useState<FileProps | null>(null);
  const [dirStats, setDirStats] = useState<DirStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../../api/properties').then(({ getFileProperties }) => {
      getFileProperties(path).then((p) => {
        setProps(p);
        setLoading(false);
        // If directory, also fetch deep stats
        if (p.is_dir) {
          import('../../api/filesystem').then(({ dirStats: getDirStats }) => {
            getDirStats(path).then((s: DirStats) => setDirStats(s)).catch(() => {});
          });
        }
      }).catch(() => setLoading(false));
    });
  }, [path]);

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 8, padding: 24, width: 400, maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: 'var(--t1)', fontSize: 16, fontWeight: 600, fontFamily: 'inherit' }}>Properties</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 18, fontFamily: 'inherit',
          }}>x</button>
        </div>

        {loading && <div style={{ color: 'var(--t3)' }}>Loading...</div>}

        {props && (
          <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 2 }}>
            <Row label="Name" value={props.name} />
            {props.extension && <Row label="Type" value={`${props.extension.toUpperCase()} File`} />}
            {props.is_dir && <Row label="Type" value="Folder" />}
            <Row label="Location" value={path.replace(/[\\/][^\\/]+$/, '')} />
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />

            {!props.is_dir && <Row label="Size" value={`${formatSize(props.size)} (${props.size.toLocaleString()} bytes)`} />}

            {props.is_dir && props.file_count !== null && (
              <Row label="Contains" value={`${props.file_count} files, ${props.dir_count} folders`} />
            )}

            {dirStats && (
              <>
                <Row label="Size (deep)" value={`${formatSize(dirStats.total_size)} (${dirStats.total_size.toLocaleString()} bytes)`} />
                <Row label="Total contents" value={`${dirStats.file_count} files, ${dirStats.dir_count} folders${dirStats.truncated ? ' (truncated)' : ''}`} />
              </>
            )}

            <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
            <Row label="Created" value={formatDate(props.created)} />
            <Row label="Modified" value={formatDate(props.modified)} />
            <Row label="Accessed" value={formatDate(props.accessed)} />

            <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
            <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
              <AttrCheckbox label="Read-only" checked={props.readonly} path={path} attr="readonly" />
              <AttrCheckbox label="Hidden" checked={props.hidden} path={path} attr="hidden" />
              <AttrCheckbox label="System" checked={props.system} path={path} attr="system" />
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <span style={{ color: 'var(--t3)', minWidth: 90, flexShrink: 0 }}>{label}:</span>
      <span style={{ color: 'var(--t1)', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

function AttrCheckbox({ label, checked, path, attr }: { label: string; checked: boolean; path: string; attr: string }) {
  const [val, setVal] = useState(checked);
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11 }}>
      <input
        type="checkbox"
        checked={val}
        onChange={async (e) => {
          const newVal = e.target.checked;
          setVal(newVal);
          const { setFileAttribute } = await import('../../api/properties');
          setFileAttribute(path, attr, newVal).catch(() => setVal(!newVal));
        }}
        style={{ accentColor: 'var(--accent)' }}
      />
      {label}
    </label>
  );
}
