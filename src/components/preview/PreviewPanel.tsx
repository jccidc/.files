import { useRef, useCallback } from 'react';
import { usePreviewStore } from '../../stores/preview';
import { PreviewRenderer } from './PreviewRenderer';
import { getFileType } from '../../utils/fileType';
import type { FileEntry } from '../../types';

function getTypeBadge(entry: FileEntry): string {
  const ft = getFileType(entry);
  switch (ft.kind) {
    case 'code': return ft.language.toUpperCase();
    case 'image': return 'IMAGE';
    case 'svg': return 'SVG';
    case 'markdown': return 'MARKDOWN';
    case 'pdf': return 'PDF';
    case 'docx': return 'DOCX';
    case 'xlsx': return 'XLSX';
    case 'video': return 'VIDEO';
    case 'audio': return 'AUDIO';
    case 'folder': return 'FOLDER';
    default: return (entry.extension || 'FILE').toUpperCase();
  }
}

export function PreviewPanel() {
  const previewEntry = usePreviewStore((s) => s.previewEntry);
  const pinned = usePreviewStore((s) => s.pinned);
  const panelWidth = usePreviewStore((s) => s.panelWidth);
  const togglePinned = usePreviewStore((s) => s.togglePinned);
  const hidePanel = usePreviewStore((s) => s.hidePanel);
  const setPanelWidth = usePreviewStore((s) => s.setPanelWidth);

  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    // Seed from the rendered width, not the stored one: a persisted width from a
    // larger window can exceed the CSS 50vw clamp, which would create a drag dead zone.
    startWidth.current = (e.currentTarget as HTMLElement).parentElement?.getBoundingClientRect().width ?? panelWidth;

    const handleMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - ev.clientX;
      const maxW = window.innerWidth * 0.5;
      setPanelWidth(Math.min(maxW, startWidth.current + delta));
    };

    const handleUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [panelWidth, setPanelWidth]);

  return (
    <div style={{
      width: panelWidth, minWidth: 250, maxWidth: '50vw', height: '100%',
      display: 'flex', flexDirection: 'column',
      borderLeft: '1px solid var(--border)',
      background: 'var(--surface)',
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute', left: -3, top: 0, bottom: 0, width: 6,
          cursor: 'col-resize', zIndex: 10,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
        onMouseLeave={(e) => { if (!dragging.current) e.currentTarget.style.background = 'transparent'; }}
      />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--raised)', minHeight: 36, flexShrink: 0,
      }}>
        {previewEntry ? (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 500, color: 'var(--t1)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {previewEntry.name}
              </div>
            </div>
            <span style={{
              background: 'var(--active)', padding: '1px 5px', borderRadius: 3,
              fontSize: 9, fontWeight: 500, color: 'var(--t3)',
            }}>
              {getTypeBadge(previewEntry)}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--t3)' }}>Preview</span>
        )}

        <button
          onClick={togglePinned}
          title={pinned ? 'Unpin (auto-follow)' : 'Pin (stay on file)'}
          style={{
            background: pinned ? 'var(--active)' : 'transparent',
            border: '1px solid var(--border)', borderRadius: 3,
            padding: '2px 4px', cursor: 'pointer', color: pinned ? 'var(--accent)' : 'var(--t3)',
            display: 'flex', alignItems: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill={pinned ? 'var(--accent)' : 'none'} stroke="currentColor" strokeWidth="1.5">
            <path d="M9.5 2.5L13.5 6.5L10 10L8 14L2 8L6 6L9.5 2.5Z" />
            <line x1="2" y1="14" x2="5" y2="11" />
          </svg>
        </button>

        <button
          onClick={hidePanel}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--t3)', cursor: 'pointer', padding: '2px 4px',
            display: 'flex', alignItems: 'center', fontSize: 14,
          }}
        >
          x
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {previewEntry ? (
          <PreviewRenderer entry={previewEntry} />
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--t3)', fontSize: 12,
          }}>
            Select a file to preview
          </div>
        )}
      </div>
    </div>
  );
}
