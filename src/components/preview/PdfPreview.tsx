import { convertFileSrc } from '@tauri-apps/api/core';

interface Props {
  path: string;
}

export function PdfPreview({ path }: Props) {
  const assetUrl = convertFileSrc(path);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--raised)', fontSize: 11, color: 'var(--t3)',
      }}>
        <span style={{ textTransform: 'uppercase', fontWeight: 500 }}>PDF</span>
      </div>
      <iframe
        src={assetUrl}
        title="PDF Preview"
        style={{
          flex: 1,
          border: 'none',
          background: 'var(--deep)',
          width: '100%',
        }}
      />
    </div>
  );
}
