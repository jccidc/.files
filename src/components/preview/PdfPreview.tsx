import { useState, useEffect, useRef, useCallback } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface Props {
  path: string;
}

export function PdfPreview({ path }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Load PDF document via Tauri asset protocol
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    (async () => {
      try {
        const url = convertFileSrc(path);
        const resp = await fetch(url);
        const buffer = await resp.arrayBuffer();
        const data = new Uint8Array(buffer);
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) { pdf.destroy(); return; }
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (e) {
        if (!cancelled) setError(String(e));
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
    };
  }, [path]);

  // Render current page
  const renderPage = useCallback(async () => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;

    try {
      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
    } catch (e) {
      setError(String(e));
    }
  }, [currentPage, scale]);

  useEffect(() => {
    if (!loading && !error) renderPage();
  }, [loading, error, renderPage]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--raised)', fontSize: 11, color: 'var(--t3)',
      }}>
        <span style={{ textTransform: 'uppercase', fontWeight: 500 }}>PDF</span>
        {numPages > 0 && (
          <>
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} style={toolBtn}>Prev</button>
            <span>{currentPage} / {numPages}</span>
            <button onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))} disabled={currentPage >= numPages} style={toolBtn}>Next</button>
            <div style={{ flex: 1 }} />
            <button onClick={() => setScale((s) => Math.max(0.5, s - 0.25))} style={toolBtn}>-</button>
            <span style={{ minWidth: 40, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale((s) => Math.min(4, s + 0.25))} style={toolBtn}>+</button>
          </>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', background: 'var(--deep)', padding: 16 }}>
        {loading && <div style={{ color: 'var(--t3)', padding: 24 }}>Loading PDF...</div>}
        {error && <div style={{ color: 'var(--red)', padding: 24, fontSize: 12 }}>{error}</div>}
        {!loading && !error && <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto' }} />}
      </div>
    </div>
  );
}

const toolBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 3,
  color: 'var(--t2)',
  fontSize: 10,
  padding: '2px 8px',
  cursor: 'pointer',
  lineHeight: 1,
};
