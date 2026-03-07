import type { ThemeRegistrationRaw } from 'shiki';

export function createShikiTheme(): ThemeRegistrationRaw {
  const style = getComputedStyle(document.documentElement);
  const get = (prop: string) => style.getPropertyValue(prop).trim();

  return {
    name: 'dotfiles',
    type: 'dark',
    colors: {
      'editor.background': get('--surface') || '#161A21',
      'editor.foreground': get('--t1') || '#D8DEE9',
      'editorLineNumber.foreground': get('--t3') || '#4C5567',
      'editorLineNumber.activeForeground': get('--t2') || '#8891A0',
      'editor.selectionBackground': get('--active') || '#262C38',
    },
    tokenColors: [
      { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: get('--t3') || '#4C5567', fontStyle: 'italic' } },
      { scope: ['string', 'string.quoted'], settings: { foreground: get('--green') || '#4ADE80' } },
      { scope: ['constant.numeric', 'constant.language'], settings: { foreground: get('--warm') || '#D4A06A' } },
      { scope: ['keyword', 'storage.type', 'storage.modifier'], settings: { foreground: get('--purple') || '#C084FC' } },
      { scope: ['entity.name.function', 'support.function'], settings: { foreground: get('--accent') || '#3B82F6' } },
      { scope: ['entity.name.type', 'support.type', 'entity.name.class'], settings: { foreground: get('--cyan') || '#22D3EE' } },
      { scope: ['variable', 'variable.other'], settings: { foreground: get('--t1') || '#D8DEE9' } },
      { scope: ['entity.name.tag'], settings: { foreground: get('--red') || '#F87171' } },
      { scope: ['entity.other.attribute-name'], settings: { foreground: get('--yellow') || '#FBBF24' } },
      { scope: ['meta.embedded', 'source.groovy.embedded'], settings: { foreground: get('--t1') || '#D8DEE9' } },
      { scope: ['punctuation'], settings: { foreground: get('--t2') || '#8891A0' } },
      { scope: ['constant.other', 'variable.other.constant'], settings: { foreground: get('--warm') || '#D4A06A' } },
      { scope: ['keyword.operator'], settings: { foreground: get('--t2') || '#8891A0' } },
      { scope: ['support.constant', 'constant.character.escape'], settings: { foreground: get('--cyan') || '#22D3EE' } },
    ],
  };
}
