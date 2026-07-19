import { useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { FileIcon } from '../common/FileIcon';
import { InlineRename } from './InlineRename';
import type { FileEntry } from '../../types';

interface GalleryViewProps {
  entries: FileEntry[];
  selectedPaths: Set<string>;
  onRowClick: (entry: FileEntry, idx: number, e: React.MouseEvent) => void;
  onDoubleClick: (entry: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
  renamingPath?: string | null;
  onRenameDone?: (newName: string | null) => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '--';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'];

export function GalleryView({ entries, selectedPaths: _selectedPaths, onRowClick, onDoubleClick, onContextMenu, renamingPath, onRenameDone }: GalleryViewProps) {
  const [focusedIdx, setFocusedIdx] = useState(0);
  const focused = entries[focusedIdx];
  const renamingEntry = renamingPath ? entries.find((en) => en.path === renamingPath) : undefined;

  if (entries.length === 0) {
    return <div style={{ padding: 24, color: 'var(--t3)', textAlign: 'center', flex: 1 }}>Empty directory</div>;
  }

  const isImage = focused && IMAGE_EXTS.includes((focused.extension || '').toLowerCase());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Main preview area */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--deep)', overflow: 'hidden', position: 'relative',
        minHeight: 200,
      }}>
        {focused && (
          <div style={{
            textAlign: 'center', padding: 20,
            width: '100%', height: '100%', minHeight: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isImage ? (
              <img
                src={`${convertFileSrc(focused.path)}?v=${encodeURIComponent(focused.modified)}`}
                alt={focused.name}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <FileIcon entry={focused} size={64} />
                <div style={{ color: 'var(--t1)', fontSize: 16, fontWeight: 500 }}>{focused.name}</div>
                <div style={{ color: 'var(--t3)', fontSize: 12 }}>
                  {focused.is_dir ? 'Folder' : `${(focused.extension || '').toUpperCase()} File`}
                  {!focused.is_dir && ` — ${formatSize(focused.size)}`}
                </div>
              </div>
            )}
          </div>
        )}
        {renamingEntry && onRenameDone && (
          <div style={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
            background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)', width: 'min(360px, 80%)',
          }}>
            <FileIcon entry={renamingEntry} size={16} />
            <InlineRename entry={renamingEntry} onDone={onRenameDone} />
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      <div style={{
        height: 80, minHeight: 80,
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '0 8px',
        gap: 4,
      }}>
        {entries.map((entry, idx) => {
          const isFocused = idx === focusedIdx;
          const isImg = IMAGE_EXTS.includes((entry.extension || '').toLowerCase());
          return (
            <div
              key={entry.path}
              onClick={(e) => { setFocusedIdx(idx); onRowClick(entry, idx, e); }}
              onDoubleClick={() => onDoubleClick(entry)}
              onContextMenu={(e) => { e.preventDefault(); setFocusedIdx(idx); onContextMenu(e, entry); }}
              style={{
                width: 60, height: 60, flexShrink: 0,
                borderRadius: 4, overflow: 'hidden',
                border: isFocused ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isFocused ? 'var(--active)' : 'var(--raised)',
              }}
            >
              {isImg ? (
                <img
                  src={`${convertFileSrc(entry.path)}?v=${encodeURIComponent(entry.modified)}`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <FileIcon entry={entry} size={24} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
