import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settings';
import { THEMES, applyTheme } from '../theme/themes';

export function useTheme() {
  const theme = useSettingsStore((s) => s.settings.theme);
  const accentColor = useSettingsStore((s) => s.settings.accent_color);
  const uiScale = useSettingsStore((s) => s.settings.ui_scale);

  useEffect(() => {
    const tokens = THEMES[theme] || THEMES['dotfiles-dark'];
    applyTheme(tokens, accentColor || undefined);
  }, [theme, accentColor]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${(uiScale / 100) * 13}px`;
  }, [uiScale]);
}
