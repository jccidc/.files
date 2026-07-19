import { useState, useRef, useCallback, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

interface Props {
  path: string;
  name: string;
  /** File mtime (or any change token) — busts WebView2's asset cache so a
      re-saved file at the same path shows fresh bytes, not the cached old ones */
  version?: string;
}

export function ImagePreview({ path, name, version }: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [loadError, setLoadError] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const assetUrl = convertFileSrc(path) + (version ? `?v=${encodeURIComponent(version)}` : '');

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => { resetView(); setLoadError(false); }, [path, resetView]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left - rect.width / 2;
    const cursorY = e.clientY - rect.top - rect.height / 2;

    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(0.1, Math.min(20, zoom * factor));

    const scale = newZoom / zoom;
    const newPanX = cursorX - scale * (cursorX - pan.x);
    const newPanY = cursorY - scale * (cursorY - pan.y);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [zoom, pan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--raised)', fontSize: 11, color: 'var(--t3)',
      }}>
        {naturalSize.w > 0 && (
          <span>{naturalSize.w} x {naturalSize.h}</span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => setZoom((z) => Math.max(0.1, z / 1.25))} style={toolBtn}>-</button>
        <span style={{ minWidth: 40, textAlign: 'center', fontSize: 10 }}>{zoomPercent}%</span>
        <button onClick={() => setZoom((z) => Math.min(20, z * 1.25))} style={toolBtn}>+</button>
        <button onClick={resetView} style={toolBtn}>Fit</button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={toolBtn}>1:1</button>
      </div>
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1, overflow: 'hidden', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          cursor: dragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
          background: `
            var(--deep),
            repeating-conic-gradient(var(--surface) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px
          `,
        }}
      >
        {loadError ? (
          <div style={{ textAlign: 'center', color: 'var(--t3)', fontSize: 12, padding: 24 }}>
            <div style={{ marginBottom: 8 }}>Failed to load image</div>
            <div style={{ fontSize: 10, color: 'var(--t3)', wordBreak: 'break-all', maxWidth: 400 }}>{path}</div>
          </div>
        ) : (
          <img
            src={assetUrl}
            alt={name}
            draggable={false}
            onLoad={(e) => {
              const img = e.target as HTMLImageElement;
              setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
            }}
            onError={() => setLoadError(true)}
            style={{
              maxWidth: zoom === 1 ? '100%' : undefined,
              maxHeight: zoom === 1 ? '100%' : undefined,
              objectFit: 'contain',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: dragging ? 'none' : 'transform 0.1s ease-out',
              imageRendering: zoom > 3 ? 'pixelated' : 'auto',
            }}
          />
        )}
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
