import { useState, useEffect, useRef } from 'react';
import type { FileEntry } from '../../types';

interface InlineRenameProps {
  entry: FileEntry;
  onDone: (newName: string | null) => void;
  style?: React.CSSProperties;
}

export function InlineRename({ entry, onDone, style }: InlineRenameProps) {
  const [value, setValue] = useState(entry.name);
  const ref = useRef<HTMLInputElement>(null);
  // Fire onDone exactly once: Enter commits, then the input unmounts, which
  // fires blur — without this guard the blur would call onDone a second time.
  const done = useRef(false);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      const dotIdx = entry.name.lastIndexOf('.');
      ref.current.setSelectionRange(0, dotIdx > 0 ? dotIdx : entry.name.length);
    }
  }, []);

  const finish = (commit: boolean) => {
    if (done.current) return;
    done.current = true;
    const trimmed = value.trim();
    onDone(commit && trimmed && trimmed !== entry.name ? trimmed : null);
  };

  return (
    <input
      ref={ref} value={value}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(true);
        else if (e.key === 'Escape') finish(false);
      }}
      onBlur={() => finish(true)}
      style={{
        background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 3,
        padding: '1px 4px', color: 'var(--t1)', fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace", outline: 'none',
        flex: 1, minWidth: 0, height: 22, boxSizing: 'border-box',
        ...style,
      }}
    />
  );
}
