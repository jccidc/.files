import type { FileEntry } from '../types';

export type FilePreviewType =
  | { kind: 'code'; language: string }
  | { kind: 'image' }
  | { kind: 'svg' }
  | { kind: 'markdown' }
  | { kind: 'video'; mime: string }
  | { kind: 'audio'; mime: string }
  | { kind: 'folder' }
  | { kind: 'unknown' };

const imageExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'ico', 'avif', 'tiff', 'tif']);

const videoExts: Record<string, string> = {
  mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime',
  avi: 'video/x-msvideo', mkv: 'video/x-matroska',
};

const audioExts: Record<string, string> = {
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
  aac: 'audio/aac', m4a: 'audio/mp4', wma: 'audio/x-ms-wma',
};

const codeExtMap: Record<string, string> = {
  js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
  py: 'python', rs: 'rust', go: 'go', java: 'java',
  c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp', cs: 'csharp',
  rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
  lua: 'lua', r: 'r', scala: 'scala', dart: 'dart',
  sql: 'sql', graphql: 'graphql', gql: 'graphql',
  html: 'html', css: 'css', scss: 'scss', sass: 'sass', less: 'less',
  json: 'json', jsonc: 'jsonc', yaml: 'yaml', yml: 'yaml',
  toml: 'toml', xml: 'xml', ini: 'ini', cfg: 'ini',
  sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'fish',
  bat: 'bat', ps1: 'powershell', psm1: 'powershell',
  dockerfile: 'dockerfile', makefile: 'makefile',
  vim: 'viml', tex: 'latex', diff: 'diff', patch: 'diff',
  csv: 'csv', tsv: 'csv', log: 'log',
  txt: 'plaintext', text: 'plaintext', env: 'dotenv',
  gitignore: 'gitignore', editorconfig: 'ini',
  gpc: 'c',
};

export function getFileType(entry: FileEntry): FilePreviewType {
  if (entry.is_dir) return { kind: 'folder' };

  const ext = (entry.extension || '').toLowerCase();
  const nameLower = entry.name.toLowerCase();

  if (nameLower === 'dockerfile') return { kind: 'code', language: 'dockerfile' };
  if (nameLower === 'makefile') return { kind: 'code', language: 'makefile' };
  if (nameLower === '.gitignore') return { kind: 'code', language: 'gitignore' };
  if (nameLower === '.env' || nameLower === '.env.local') return { kind: 'code', language: 'dotenv' };

  if (!ext) return { kind: 'unknown' };

  if (ext === 'svg') return { kind: 'svg' };
  if (ext === 'md' || ext === 'mdx' || ext === 'markdown') return { kind: 'markdown' };
  if (imageExts.has(ext)) return { kind: 'image' };
  if (videoExts[ext]) return { kind: 'video', mime: videoExts[ext] };
  if (audioExts[ext]) return { kind: 'audio', mime: audioExts[ext] };

  const lang = codeExtMap[ext];
  if (lang) return { kind: 'code', language: lang };

  return { kind: 'unknown' };
}
