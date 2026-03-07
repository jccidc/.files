export interface ThemeTokens {
  id: string;
  name: string;
  void: string;
  deepest: string;
  deep: string;
  base: string;
  surface: string;
  raised: string;
  hover: string;
  active: string;
  border: string;
  t1: string;
  t2: string;
  t3: string;
  accent: string;
  aglow: string;
  warm: string;
  green: string;
  red: string;
  yellow: string;
  purple: string;
  cyan: string;
}

export const THEMES: Record<string, ThemeTokens> = {
  'dotfiles-dark': {
    id: 'dotfiles-dark',
    name: '.files Dark',
    void: '#08090C',
    deepest: '#0A0C10',
    deep: '#0D1017',
    base: '#111419',
    surface: '#161A21',
    raised: '#1C2028',
    hover: '#1F242D',
    active: '#262C38',
    border: '#1A1F28',
    t1: '#D8DEE9',
    t2: '#8891A0',
    t3: '#4C5567',
    accent: '#3B82F6',
    aglow: 'rgba(59,130,246,0.12)',
    warm: '#D4A06A',
    green: '#4ADE80',
    red: '#F87171',
    yellow: '#FBBF24',
    purple: '#C084FC',
    cyan: '#22D3EE',
  },

  'dotfiles-light': {
    id: 'dotfiles-light',
    name: '.files Light',
    void: '#F8F9FB',
    deepest: '#F0F2F5',
    deep: '#E8EBF0',
    base: '#FFFFFF',
    surface: '#F4F5F7',
    raised: '#EBEDF0',
    hover: '#E2E5EA',
    active: '#D4D8E0',
    border: '#D0D4DC',
    t1: '#1A1D24',
    t2: '#5C6578',
    t3: '#8B93A5',
    accent: '#2563EB',
    aglow: 'rgba(37,99,235,0.10)',
    warm: '#B8860B',
    green: '#16A34A',
    red: '#DC2626',
    yellow: '#CA8A04',
    purple: '#9333EA',
    cyan: '#0891B2',
  },

  'high-contrast': {
    id: 'high-contrast',
    name: 'High Contrast',
    void: '#000000',
    deepest: '#000000',
    deep: '#0A0A0A',
    base: '#111111',
    surface: '#1A1A1A',
    raised: '#222222',
    hover: '#333333',
    active: '#444444',
    border: '#555555',
    t1: '#FFFFFF',
    t2: '#CCCCCC',
    t3: '#888888',
    accent: '#00AAFF',
    aglow: 'rgba(0,170,255,0.15)',
    warm: '#FFD700',
    green: '#00FF7F',
    red: '#FF4444',
    yellow: '#FFD700',
    purple: '#DA70D6',
    cyan: '#00FFFF',
  },
};

export const ACCENT_PRESETS = [
  '#3B82F6', // Blue (default)
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F97316', // Orange
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#EAB308', // Yellow
  '#EF4444', // Red
];

export function applyTheme(theme: ThemeTokens, accentOverride?: string) {
  const root = document.documentElement;
  const accent = accentOverride || theme.accent;
  root.style.setProperty('--void', theme.void);
  root.style.setProperty('--deepest', theme.deepest);
  root.style.setProperty('--deep', theme.deep);
  root.style.setProperty('--base', theme.base);
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--raised', theme.raised);
  root.style.setProperty('--hover', theme.hover);
  root.style.setProperty('--active', theme.active);
  root.style.setProperty('--border', theme.border);
  root.style.setProperty('--t1', theme.t1);
  root.style.setProperty('--t2', theme.t2);
  root.style.setProperty('--t3', theme.t3);
  root.style.setProperty('--accent', accent);
  // Recompute aglow from accent
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  root.style.setProperty('--aglow', `rgba(${r},${g},${b},0.12)`);
  root.style.setProperty('--warm', theme.warm);
  root.style.setProperty('--green', theme.green);
  root.style.setProperty('--red', theme.red);
  root.style.setProperty('--yellow', theme.yellow);
  root.style.setProperty('--purple', theme.purple);
  root.style.setProperty('--cyan', theme.cyan);
}
