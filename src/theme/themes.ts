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

  'midnight-blue': {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    void: '#0A0E1A',
    deepest: '#0D1224',
    deep: '#10162B',
    base: '#141B33',
    surface: '#1A2240',
    raised: '#202A4D',
    hover: '#263259',
    active: '#2E3C6B',
    border: '#1E2848',
    t1: '#CBD5F0',
    t2: '#7B8BB5',
    t3: '#4A5680',
    accent: '#5B8DEF',
    aglow: 'rgba(91,141,239,0.12)',
    warm: '#E8B87A',
    green: '#5EEAA0',
    red: '#FF7B7B',
    yellow: '#FFD06B',
    purple: '#B894F6',
    cyan: '#4DD8E8',
  },

  'monokai-pro': {
    id: 'monokai-pro',
    name: 'Monokai Pro',
    void: '#19181A',
    deepest: '#1D1C1E',
    deep: '#221F22',
    base: '#2D2A2E',
    surface: '#363337',
    raised: '#403E41',
    hover: '#4A474B',
    active: '#565356',
    border: '#3A383B',
    t1: '#FCFCFA',
    t2: '#C1C0C0',
    t3: '#727072',
    accent: '#FFD866',
    aglow: 'rgba(255,216,102,0.10)',
    warm: '#FC9867',
    green: '#A9DC76',
    red: '#FF6188',
    yellow: '#FFD866',
    purple: '#AB9DF2',
    cyan: '#78DCE8',
  },

  'dracula': {
    id: 'dracula',
    name: 'Dracula',
    void: '#1E1F29',
    deepest: '#21222C',
    deep: '#252631',
    base: '#282A36',
    surface: '#2E303E',
    raised: '#343746',
    hover: '#3B3E50',
    active: '#44475A',
    border: '#343746',
    t1: '#F8F8F2',
    t2: '#BFBFB6',
    t3: '#6272A4',
    accent: '#BD93F9',
    aglow: 'rgba(189,147,249,0.12)',
    warm: '#FFB86C',
    green: '#50FA7B',
    red: '#FF5555',
    yellow: '#F1FA8C',
    purple: '#BD93F9',
    cyan: '#8BE9FD',
  },

  'nord': {
    id: 'nord',
    name: 'Nord',
    void: '#242933',
    deepest: '#272C36',
    deep: '#2B303B',
    base: '#2E3440',
    surface: '#353B49',
    raised: '#3B4252',
    hover: '#434C5E',
    active: '#4C566A',
    border: '#3B4252',
    t1: '#ECEFF4',
    t2: '#D8DEE9',
    t3: '#7B88A1',
    accent: '#88C0D0',
    aglow: 'rgba(136,192,208,0.12)',
    warm: '#D08770',
    green: '#A3BE8C',
    red: '#BF616A',
    yellow: '#EBCB8B',
    purple: '#B48EAD',
    cyan: '#8FBCBB',
  },

  'catppuccin-mocha': {
    id: 'catppuccin-mocha',
    name: 'Catppuccin',
    void: '#11111B',
    deepest: '#151520',
    deep: '#181825',
    base: '#1E1E2E',
    surface: '#252537',
    raised: '#313244',
    hover: '#3B3C52',
    active: '#45475A',
    border: '#2A2B3D',
    t1: '#CDD6F4',
    t2: '#A6ADC8',
    t3: '#6C7086',
    accent: '#CBA6F7',
    aglow: 'rgba(203,166,247,0.12)',
    warm: '#FAB387',
    green: '#A6E3A1',
    red: '#F38BA8',
    yellow: '#F9E2AF',
    purple: '#CBA6F7',
    cyan: '#94E2D5',
  },

  'solarized-dark': {
    id: 'solarized-dark',
    name: 'Solarized',
    void: '#00212B',
    deepest: '#002731',
    deep: '#002B36',
    base: '#073642',
    surface: '#0D3F4E',
    raised: '#134858',
    hover: '#1A5264',
    active: '#225C70',
    border: '#0F4454',
    t1: '#FDF6E3',
    t2: '#93A1A1',
    t3: '#657B83',
    accent: '#268BD2',
    aglow: 'rgba(38,139,210,0.12)',
    warm: '#CB4B16',
    green: '#859900',
    red: '#DC322F',
    yellow: '#B58900',
    purple: '#6C71C4',
    cyan: '#2AA198',
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
