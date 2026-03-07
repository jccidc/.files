import type { FileEntry } from '../../types';
import { getFileType } from '../../utils/fileType';
import { CodePreview } from './CodePreview';
import { ImagePreview } from './ImagePreview';
import { SvgPreview } from './SvgPreview';
import { MarkdownPreview } from './MarkdownPreview';
import { MediaPreview } from './MediaPreview';
import { FolderPreview } from './FolderPreview';

interface Props {
  entry: FileEntry;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

export function PreviewRenderer({ entry }: Props) {
  const fileType = getFileType(entry);

  switch (fileType.kind) {
    case 'code':
      return <CodePreview path={entry.path} language={fileType.language} />;
    case 'image':
      return <ImagePreview path={entry.path} name={entry.name} />;
    case 'svg':
      return <SvgPreview path={entry.path} name={entry.name} />;
    case 'markdown':
      return <MarkdownPreview path={entry.path} />;
    case 'video':
      return <MediaPreview path={entry.path} name={entry.name} kind="video" mime={fileType.mime} />;
    case 'audio':
      return <MediaPreview path={entry.path} name={entry.name} kind="audio" mime={fileType.mime} />;
    case 'folder':
      return <FolderPreview entry={entry} />;
    case 'unknown':
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', gap: 8, color: 'var(--t3)',
        }}>
          <svg width="48" height="48" viewBox="0 0 16 16" fill="none" stroke="var(--t3)" strokeWidth="0.8">
            <path d="M4 1.5h5l3.5 3.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1z" />
          </svg>
          <div style={{ fontSize: 13 }}>
            {(entry.extension || '').toUpperCase() || 'Unknown'} file
          </div>
          <div style={{ fontSize: 11 }}>{formatSize(entry.size)}</div>
          <div style={{ fontSize: 10, marginTop: 4 }}>No preview available</div>
        </div>
      );
  }
}
