import type { ThemeTokens } from '../types';
export type { ThemeTokens };

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

  'cyberpunk': {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    void: '#05000A',
    deepest: '#08010F',
    deep: '#0C0215',
    base: '#10041C',
    surface: '#160824',
    raised: '#1E0E2E',
    hover: '#261438',
    active: '#301A44',
    border: '#2A1040',
    t1: '#F0E6FF',
    t2: '#A78EC0',
    t3: '#6B4D80',
    accent: '#FF2E97',
    aglow: 'rgba(255,46,151,0.12)',
    warm: '#FF6B2E',
    green: '#39FF14',
    red: '#FF1744',
    yellow: '#FFE500',
    purple: '#BF00FF',
    cyan: '#00F0FF',
  },

  'synthwave': {
    id: 'synthwave',
    name: 'Synthwave',
    void: '#0A0012',
    deepest: '#0E0218',
    deep: '#13061F',
    base: '#1A0B2E',
    surface: '#221339',
    raised: '#2B1B44',
    hover: '#342450',
    active: '#3E2D5C',
    border: '#2E1A48',
    t1: '#F5E6FF',
    t2: '#B89ACD',
    t3: '#7A5F8F',
    accent: '#F834FF',
    aglow: 'rgba(248,52,255,0.12)',
    warm: '#FF6E27',
    green: '#72F1B8',
    red: '#FE4450',
    yellow: '#FEDE5D',
    purple: '#F834FF',
    cyan: '#36F9F6',
  },

  'claude': {
    id: 'claude',
    name: 'Claude',
    void: '#1B1512',
    deepest: '#1F1915',
    deep: '#241E19',
    base: '#2B241E',
    surface: '#332B24',
    raised: '#3C332B',
    hover: '#463C33',
    active: '#51463C',
    border: '#3E3329',
    t1: '#F5EBE1',
    t2: '#C4B5A4',
    t3: '#847462',
    accent: '#E07B4F',
    aglow: 'rgba(224,123,79,0.16)',
    warm: '#E07B4F',
    green: '#6DBF7B',
    red: '#E05D5D',
    yellow: '#DAA54E',
    purple: '#B48CC8',
    cyan: '#5CB8C4',
  },

  'emerald-matrix': {
    id: 'emerald-matrix',
    name: 'Emerald Matrix',
    void: '#000A04',
    deepest: '#001208',
    deep: '#00180C',
    base: '#002010',
    surface: '#002A18',
    raised: '#003420',
    hover: '#004028',
    active: '#004C30',
    border: '#003822',
    t1: '#C8FFD4',
    t2: '#6ABF7B',
    t3: '#38804A',
    accent: '#00FF6A',
    aglow: 'rgba(0,255,106,0.12)',
    warm: '#FFB347',
    green: '#00FF6A',
    red: '#FF4D4D',
    yellow: '#D4FF00',
    purple: '#00FFC8',
    cyan: '#00E5FF',
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

export function applyTheme(theme: ThemeTokens, accentOverride?: string, secondaryAccent?: string, gradientAccent?: boolean) {
  const root = document.documentElement;
  const accent = accentOverride || theme.accent;
  const accent2 = secondaryAccent || accent;
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
  // Recompute accent-derived colors
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  root.style.setProperty('--aglow', `rgba(${r},${g},${b},0.12)`);
  // Accent-tinted hover and selection backgrounds
  root.style.setProperty('--hover', `rgba(${r},${g},${b},0.08)`);
  root.style.setProperty('--active', `rgba(${r},${g},${b},0.16)`);
  // Secondary accent + gradient
  root.style.setProperty('--accent2', accent2);
  const r2 = parseInt(accent2.slice(1, 3), 16);
  const g2 = parseInt(accent2.slice(3, 5), 16);
  const b2 = parseInt(accent2.slice(5, 7), 16);
  root.style.setProperty('--aglow2', `rgba(${r2},${g2},${b2},0.12)`);
  if (gradientAccent) {
    root.style.setProperty('--active', `linear-gradient(90deg, rgba(${r},${g},${b},0.16), rgba(${r2},${g2},${b2},0.16))`);
    root.style.setProperty('--accent-grad', `linear-gradient(135deg, ${accent}, ${accent2})`);
  } else {
    root.style.setProperty('--accent-grad', accent);
  }
  root.style.setProperty('--warm', theme.warm);
  root.style.setProperty('--green', theme.green);
  root.style.setProperty('--red', theme.red);
  root.style.setProperty('--yellow', theme.yellow);
  root.style.setProperty('--purple', theme.purple);
  root.style.setProperty('--cyan', theme.cyan);
}

// ---------------------------------------------------------------------------
// Color utility functions (private)
// ---------------------------------------------------------------------------

/** Parse hex to RGB tuple */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** RGB tuple to hex */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

/** Darken a hex color by percent (0-100) */
function darken(hex: string, pct: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = 1 - pct / 100;
  return rgbToHex(r * f, g * f, b * f);
}

/** Lighten a hex color by percent (0-100) */
function lighten(hex: string, pct: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = pct / 100;
  return rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
}

/** Mix two hex colors (0 = all colorA, 1 = all colorB) */
function mixColors(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  );
}

// ---------------------------------------------------------------------------
// Theme derivation, resolution, and validation (exported)
// ---------------------------------------------------------------------------

/** Derive full 24-token theme from 6 key colors + a base theme for status colors */
export function deriveTokens(
  name: string,
  base: string,
  surface: string,
  t1: string,
  accent: string,
  border: string,
  warm: string,
  baseTheme: ThemeTokens,
): ThemeTokens {
  const [ar, ag, ab] = hexToRgb(accent);
  return {
    id: '', // caller sets this
    name,
    void: darken(base, 20),
    deepest: darken(base, 15),
    deep: darken(base, 8),
    base,
    surface,
    raised: lighten(surface, 5),
    hover: lighten(base, 10),
    active: lighten(base, 18),
    border,
    t1,
    t2: mixColors(t1, base, 0.5),
    t3: mixColors(t1, base, 0.75),
    accent,
    aglow: `rgba(${ar},${ag},${ab},0.12)`,
    warm,
    green: baseTheme.green,
    red: baseTheme.red,
    yellow: baseTheme.yellow,
    purple: baseTheme.purple,
    cyan: baseTheme.cyan,
  };
}

/** Look up theme by id: built-in first, then custom, fallback to dotfiles-dark */
export function resolveTheme(id: string, customThemes: ThemeTokens[]): ThemeTokens {
  return THEMES[id] || customThemes.find(t => t.id === id) || THEMES['dotfiles-dark'];
}

const THEME_KEYS: (keyof ThemeTokens)[] = [
  'id', 'name', 'void', 'deepest', 'deep', 'base', 'surface', 'raised',
  'hover', 'active', 'border', 't1', 't2', 't3', 'accent', 'aglow',
  'warm', 'green', 'red', 'yellow', 'purple', 'cyan',
];

/** Validate that an object has all ThemeTokens fields as strings */
export function validateThemeJson(obj: unknown): obj is ThemeTokens {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return THEME_KEYS.every(k => typeof o[k] === 'string');
}
