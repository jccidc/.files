import { useState } from 'react';
import { ImagePreview } from './ImagePreview';
import { CodePreview } from './CodePreview';

interface Props {
  path: string;
  name: string;
}

export function SvgPreview({ path, name }: Props) {
  const [mode, setMode] = useState<'rendered' | 'source'>('rendered');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--raised)',
      }}>
        <button
          onClick={() => setMode('rendered')}
          style={{
            ...toggleBtn,
            background: mode === 'rendered' ? 'var(--active)' : 'transparent',
            color: mode === 'rendered' ? 'var(--t1)' : 'var(--t3)',
          }}
        >
          Rendered
        </button>
        <button
          onClick={() => setMode('source')}
          style={{
            ...toggleBtn,
            background: mode === 'source' ? 'var(--active)' : 'transparent',
            color: mode === 'source' ? 'var(--t1)' : 'var(--t3)',
          }}
        >
          Source
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {mode === 'rendered' ? (
          <ImagePreview path={path} name={name} />
        ) : (
          <CodePreview path={path} language="xml" />
        )}
      </div>
    </div>
  );
}

const toggleBtn: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 3,
  fontSize: 10,
  padding: '2px 10px',
  cursor: 'pointer',
};
