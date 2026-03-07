import { useEffect, useState } from 'react';
import { readFileBytes } from '../../api/filesystem';
import * as XLSX from 'xlsx';

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

interface SheetData {
  name: string;
  headers: string[];
  rows: string[][];
}

export function XlsxPreview({ path }: Props) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSheets([]);
    setActiveSheet(0);

    readFileBytes(path)
      .then((b64) => {
        if (cancelled) return;
        const arrayBuffer = base64ToArrayBuffer(b64);
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const parsed: SheetData[] = workbook.SheetNames.map((name) => {
          const sheet = workbook.Sheets[name];
          const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          const headers = json.length > 0 ? json[0].map(String) : [];
          const rows = json.slice(1).map((row) => row.map(String));
          return { name, headers, rows };
        });

        if (!cancelled) setSheets(parsed);
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

  const current = sheets[activeSheet];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar with sheet tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--raised)', fontSize: 11, color: 'var(--t3)',
        flexWrap: 'wrap',
      }}>
        <span style={{ textTransform: 'uppercase', fontWeight: 500, marginRight: 8 }}>XLSX</span>
        {sheets.length > 1 && sheets.map((s, i) => (
          <button
            key={s.name}
            onClick={() => setActiveSheet(i)}
            style={{
              background: i === activeSheet ? 'var(--active)' : 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 3,
              color: i === activeSheet ? 'var(--accent)' : 'var(--t2)',
              fontSize: 10,
              padding: '2px 8px',
              cursor: 'pointer',
            }}
          >
            {s.name}
          </button>
        ))}
        {current && (
          <span style={{ marginLeft: 'auto', fontSize: 10 }}>
            {current.rows.length} rows
          </span>
        )}
      </div>

      {/* Table */}
      {current ? (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{
            borderCollapse: 'collapse',
            width: '100%',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
          }}>
            <thead>
              <tr>
                {current.headers.map((h, i) => (
                  <th key={i} style={{
                    position: 'sticky', top: 0, zIndex: 1,
                    background: 'var(--raised)',
                    color: 'var(--t2)',
                    fontWeight: 600,
                    padding: '6px 10px',
                    borderBottom: '2px solid var(--border)',
                    borderRight: '1px solid var(--border)',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                  }}>
                    {h || `Col ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{
                      padding: '4px 10px',
                      borderBottom: '1px solid var(--border)',
                      borderRight: '1px solid var(--border)',
                      color: 'var(--t1)',
                      background: ri % 2 === 0 ? 'transparent' : 'var(--deep)',
                      whiteSpace: 'nowrap',
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--t3)', fontSize: 12,
        }}>
          No data
        </div>
      )}
    </div>
  );
}
