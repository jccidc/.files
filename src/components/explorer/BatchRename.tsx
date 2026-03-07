import { useState, useMemo } from 'react';
import { renameFile } from '../../api/shell';
import type { FileEntry } from '../../types';

interface BatchRenameProps {
  entries: FileEntry[];
  onClose: () => void;
  onDone: () => void;
}

type RenameMode = 'find-replace' | 'prefix-suffix' | 'numbered';

export function BatchRename({ entries, onClose, onDone }: BatchRenameProps) {
  const [mode, setMode] = useState<RenameMode>('find-replace');
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [startNum, setStartNum] = useState(1);
  const [numTemplate, setNumTemplate] = useState('File_###');
  const [running, setRunning] = useState(false);

  const previews = useMemo(() => {
    return entries.map((entry) => {
      const ext = entry.name.lastIndexOf('.') > 0 ? entry.name.slice(entry.name.lastIndexOf('.')) : '';
      const base = ext ? entry.name.slice(0, -ext.length) : entry.name;
      let newName = entry.name;

      switch (mode) {
        case 'find-replace':
          if (find) newName = entry.name.split(find).join(replace);
          break;
        case 'prefix-suffix':
          newName = prefix + base + suffix + ext;
          break;
        case 'numbered': {
          const idx = entries.indexOf(entry);
          const num = String(startNum + idx);
          const hashCount = (numTemplate.match(/#+/)?.[0] || '#').length;
          const padded = num.padStart(hashCount, '0');
          newName = numTemplate.replace(/#+/, padded) + ext;
          break;
        }
      }
      return { entry, newName, changed: newName !== entry.name };
    });
  }, [entries, mode, find, replace, prefix, suffix, startNum, numTemplate]);

  const changedCount = previews.filter((p) => p.changed).length;

  const handleApply = async () => {
    setRunning(true);
    for (const p of previews) {
      if (p.changed) {
        await renameFile(p.entry.path, p.newName).catch(() => {});
      }
    }
    setRunning(false);
    onDone();
  };

  const modeBtn = (m: RenameMode, label: string) => (
    <button
      onClick={() => setMode(m)}
      style={{
        padding: '4px 10px', fontSize: 11, border: '1px solid var(--border)',
        borderRadius: 4, cursor: 'pointer',
        background: mode === m ? 'var(--accent)' : 'var(--raised)',
        color: mode === m ? '#fff' : 'var(--t2)',
      }}
    >
      {label}
    </button>
  );

  const inputStyle: React.CSSProperties = {
    background: 'var(--base)', border: '1px solid var(--border)', borderRadius: 4,
    padding: '4px 8px', color: 'var(--t1)', fontSize: 12, outline: 'none', width: '100%',
    fontFamily: "'JetBrains Mono', monospace",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 999, display: 'flex',
        justifyContent: 'center', paddingTop: 60, background: 'rgba(0,0,0,0.5)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560, maxHeight: '80vh', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>
            Batch Rename ({entries.length} files)
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {modeBtn('find-replace', 'Find & Replace')}
            {modeBtn('prefix-suffix', 'Prefix/Suffix')}
            {modeBtn('numbered', 'Numbered')}
          </div>
        </div>

        {/* Controls */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          {mode === 'find-replace' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Find</label>
                <input value={find} onChange={(e) => setFind(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Replace</label>
                <input value={replace} onChange={(e) => setReplace(e.target.value)} style={inputStyle} />
              </div>
            </div>
          )}
          {mode === 'prefix-suffix' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Prefix</label>
                <input value={prefix} onChange={(e) => setPrefix(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Suffix (before ext)</label>
                <input value={suffix} onChange={(e) => setSuffix(e.target.value)} style={inputStyle} />
              </div>
            </div>
          )}
          {mode === 'numbered' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Template (# = number)</label>
                <input value={numTemplate} onChange={(e) => setNumTemplate(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ width: 80 }}>
                <label style={{ fontSize: 10, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Start</label>
                <input type="number" value={startNum} onChange={(e) => setStartNum(Number(e.target.value))} style={inputStyle} />
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {previews.map((p, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: 4,
              padding: '4px 16px', fontSize: 12, alignItems: 'center',
            }}>
              <span style={{ color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.entry.name}
              </span>
              <span style={{ color: 'var(--t3)', textAlign: 'center' }}>&rarr;</span>
              <span style={{
                color: p.changed ? 'var(--green)' : 'var(--t3)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {p.newName}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, color: 'var(--t3)' }}>
            {changedCount} file{changedCount !== 1 ? 's' : ''} will be renamed
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{
              padding: '6px 16px', fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 4, background: 'var(--raised)', color: 'var(--t2)', cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={running || changedCount === 0}
              style={{
                padding: '6px 16px', fontSize: 12, border: 'none', borderRadius: 4,
                background: changedCount > 0 ? 'var(--accent)' : 'var(--raised)',
                color: changedCount > 0 ? '#fff' : 'var(--t3)', cursor: changedCount > 0 ? 'pointer' : 'default',
              }}
            >
              {running ? 'Renaming...' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
