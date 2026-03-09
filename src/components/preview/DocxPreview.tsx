import { useEffect, useState } from 'react';
import { readFileBytes } from '../../api/filesystem';
import mammoth from 'mammoth';

interface Props {
  path: string;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function DocxPreview({ path }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setHtml(null);

    readFileBytes(path)
      .then((b64) => {
        if (cancelled) return;
        const arrayBuffer = base64ToArrayBuffer(b64);
        return mammoth.convertToHtml({ arrayBuffer });
      })
      .then((result) => {
        if (cancelled || !result) return;
        setHtml(result.value);
      })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [path]);

  if (loading) {
    return <div style={{ color: 'var(--t3)', padding: 16, textAlign: 'center' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--red)', padding: 16 }}>{error}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--raised)', fontSize: 11, color: 'var(--t3)',
      }}>
        <span style={{ textTransform: 'uppercase', fontWeight: 500 }}>DOCX</span>
      </div>
      <div
        style={{
          flex: 1, overflow: 'auto', padding: 16,
          color: 'var(--t1)', fontFamily: "var(--font-family)", fontSize: 14,
          lineHeight: 1.7,
        }}
        dangerouslySetInnerHTML={{ __html: html || '' }}
        className="docx-preview"
      />
      <style>{`
        .docx-preview h1, .docx-preview h2, .docx-preview h3,
        .docx-preview h4, .docx-preview h5, .docx-preview h6 {
          color: var(--t1);
          margin: 1em 0 0.5em;
        }
        .docx-preview h1 { font-size: 1.6em; }
        .docx-preview h2 { font-size: 1.3em; }
        .docx-preview h3 { font-size: 1.1em; }
        .docx-preview p { margin: 0.5em 0; }
        .docx-preview table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        .docx-preview th, .docx-preview td {
          border: 1px solid var(--border);
          padding: 6px 10px;
          text-align: left;
        }
        .docx-preview th {
          background: var(--raised);
          color: var(--t2);
          font-weight: 600;
        }
        .docx-preview a {
          color: var(--accent);
          text-decoration: underline;
        }
        .docx-preview img {
          max-width: 100%;
          border-radius: 4px;
        }
        .docx-preview ul, .docx-preview ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .docx-preview blockquote {
          border-left: 3px solid var(--accent);
          margin: 0.5em 0;
          padding: 0.25em 1em;
          color: var(--t2);
        }
      `}</style>
    </div>
  );
}
