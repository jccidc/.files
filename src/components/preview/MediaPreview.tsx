import { useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

interface Props {
  path: string;
  name: string;
  kind: 'video' | 'audio';
  mime: string;
}

function MediaError({ path }: { path: string }) {
  return (
    <div style={{ textAlign: 'center', color: 'var(--t3)', fontSize: 12, padding: 24 }}>
      <div style={{ marginBottom: 8 }}>Failed to load media</div>
      <div style={{ fontSize: 10, wordBreak: 'break-all', maxWidth: 400 }}>{path}</div>
    </div>
  );
}

export function MediaPreview({ path, name, kind, mime }: Props) {
  const assetUrl = convertFileSrc(path);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <MediaError path={path} />
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', background: 'var(--deep)', padding: 16,
      }}>
        <video
          controls
          autoPlay={false}
          onError={() => setError(true)}
          style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 4 }}
        >
          <source src={assetUrl} type={mime} />
          Video format not supported
        </video>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 16, padding: 24,
    }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polygon points="10,8 16,12 10,16" fill="var(--accent)" stroke="none" />
      </svg>
      <div style={{ color: 'var(--t1)', fontSize: 13, fontWeight: 500 }}>{name}</div>
      <audio controls autoPlay={false} onError={() => setError(true)} style={{ width: '100%', maxWidth: 400 }}>
        <source src={assetUrl} type={mime} />
        Audio format not supported
      </audio>
    </div>
  );
}
