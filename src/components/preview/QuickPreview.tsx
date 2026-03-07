import { useEffect } from 'react';
import type { FileEntry } from '../../types';
import { PreviewRenderer } from './PreviewRenderer';
import { getFileType } from '../../utils/fileType';
import { usePreviewStore } from '../../stores/preview';
import { usePanelsStore } from '../../stores/panels';

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function getTypeBadge(entry: FileEntry): string {
  const ft = getFileType(entry);
  switch (ft.kind) {
    case 'code': return ft.language.toUpperCase();
    case 'image': return 'IMAGE';
    case 'svg': return 'SVG';
    case 'markdown': return 'MARKDOWN';
    case 'video': return 'VIDEO';
    case 'audio': return 'AUDIO';
    case 'folder': return 'FOLDER';
    default: return (entry.extension || 'FILE').toUpperCase();
  }
}

export function QuickPreview({ entry, onClose }: { entry: FileEntry; onClose: () => void }) {
  const showPanel = usePreviewStore((s) => s.showPanel);
  const setPreviewEntry = usePreviewStore((s) => s.setPreviewEntry);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleOpenInPanel = () => {
    setPreviewEntry(entry);
    showPanel();
    onClose();
  };

  const handleOpenInTab = () => {
    const pid = usePanelsStore.getState().focusedPanelId;
    if (pid) {
      usePanelsStore.getState().addTab(pid, {
        id: crypto.randomUUID(),
        type: 'preview',
        title: entry.name,
        previewPath: entry.path,
        pinned: false,
      });
    }
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 998,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '70%', maxWidth: 900, maxHeight: '80vh',
          background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--raised)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t3)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                background: 'var(--active)', padding: '1px 6px', borderRadius: 3,
                fontSize: 9, fontWeight: 500,
              }}>
                {getTypeBadge(entry)}
              </span>
              {!entry.is_dir && <span>{formatSize(entry.size)}</span>}
            </div>
          </div>
          <button onClick={handleOpenInPanel} style={headerBtn} title="Open in panel">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="2" width="14" height="12" rx="1" />
              <line x1="10" y1="2" x2="10" y2="14" />
            </svg>
          </button>
          <button onClick={handleOpenInTab} style={headerBtn} title="Open in tab">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="3" width="14" height="11" rx="1" />
              <path d="M1 6h14" />
              <path d="M5 3v3" />
            </svg>
          </button>
          <div style={{
            fontSize: 10, color: 'var(--t3)', padding: '2px 8px',
            background: 'var(--surface)', borderRadius: 3,
          }}>
            Space to close
          </div>
        </div>

        {/* Preview content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <PreviewRenderer entry={entry} />
        </div>
      </div>
    </div>
  );
}

const headerBtn: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)',
  borderRadius: 4, padding: '4px 6px', cursor: 'pointer',
  color: 'var(--t2)', display: 'flex', alignItems: 'center',
};
