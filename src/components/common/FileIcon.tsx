import type { FileEntry } from '../../types';

// Extension -> color mapping
const extColors: Record<string, string> = {
  // JavaScript/TypeScript
  js: '#F7DF1E', jsx: '#61DAFB', ts: '#3178C6', tsx: '#3178C6',
  // Web
  html: '#E34F26', css: '#1572B6', scss: '#CC6699', sass: '#CC6699', less: '#1D365D',
  svg: '#FFB13B',
  // Data
  json: '#F5C518', jsonc: '#F5C518', yaml: '#CB171E', yml: '#CB171E',
  toml: '#9C4121', xml: '#E34F26', csv: '#4CAF50',
  // Languages
  py: '#3572A5', rs: '#DEA584', go: '#00ADD8', java: '#B07219',
  c: '#555555', cpp: '#F34B7D', cs: '#178600', rb: '#CC342D',
  php: '#4F5D95', swift: '#F05138', kt: '#A97BFF', lua: '#000080',
  dart: '#00B4AB', r: '#198CE7', scala: '#DC322F',
  // Shell
  sh: '#89E051', bash: '#89E051', zsh: '#89E051', ps1: '#012456', bat: '#C1F12E',
  // Config
  env: '#ECD53F', ini: '#9B9B9B', cfg: '#9B9B9B', conf: '#9B9B9B',
  // Docs
  md: '#083FA1', mdx: '#083FA1', txt: '#9B9B9B', log: '#9B9B9B',
  // Build
  dockerfile: '#2496ED', makefile: '#427819',
  // Media
  png: '#C084FC', jpg: '#C084FC', jpeg: '#C084FC', gif: '#C084FC', webp: '#C084FC',
  bmp: '#C084FC', ico: '#C084FC', avif: '#C084FC',
  mp4: '#F87171', webm: '#F87171', mov: '#F87171', avi: '#F87171', mkv: '#F87171',
  mp3: '#22D3EE', wav: '#22D3EE', ogg: '#22D3EE', flac: '#22D3EE', aac: '#22D3EE',
  // Other
  gpc: '#4ADE80', sql: '#E38C00', graphql: '#E535AB',
  gitignore: '#F05032', editorconfig: '#E0EFEF',
  lock: '#9B9B9B', diff: '#41B883', patch: '#41B883',
};

function getIconColor(entry: FileEntry): string {
  if (entry.is_dir) return 'var(--warm)';
  const ext = (entry.extension || '').toLowerCase();
  return extColors[ext] || 'var(--t3)';
}

// Smaller icon for list view (16x16)
export function FileIcon({ entry, size = 16 }: { entry: FileEntry; size?: number }) {
  const color = getIconColor(entry);

  if (entry.is_dir) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill={color} stroke="none" style={{ flexShrink: 0 }}>
        <path d="M1.5 3a1 1 0 011-1H6l1.5 1.5H13.5a1 1 0 011 1V13a1 1 0 01-1 1h-12a1 1 0 01-1-1V3z" />
      </svg>
    );
  }

  // .lnk shortcut — show as folder with arrow overlay
  if ((entry.extension || '').toLowerCase() === 'lnk') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M1.5 3a1 1 0 011-1H6l1.5 1.5H13.5a1 1 0 011 1V13a1 1 0 01-1 1h-12a1 1 0 01-1-1V3z" fill="var(--warm)" opacity="0.7" />
        <path d="M7 7l3 2.5L7 12" stroke="var(--accent)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  const ext = (entry.extension || '').toLowerCase();
  const showLabel = size >= 32;

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M4 1.5h5l3.5 3.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1z" fill="none" stroke={color} strokeWidth="1.2" />
      <polyline points="9,1.5 9,5.5 12.5,5.5" fill="none" stroke={color} strokeWidth="1.2" />
      {showLabel && ext && (
        <text
          x="8" y="12" textAnchor="middle" fill={color} stroke="none"
          style={{ fontSize: '3.5px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
        >
          {ext.toUpperCase().slice(0, 4)}
        </text>
      )}
    </svg>
  );
}
