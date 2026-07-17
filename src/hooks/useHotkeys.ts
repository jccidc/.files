import { useEffect } from 'react';

interface HotkeyBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Skip this binding (and keep the browser default) while text is highlighted,
      so e.g. Ctrl+C copies the selection instead of files. */
  unlessTextSelected?: boolean;
  handler: (e: KeyboardEvent) => void;
}

export function useHotkeys(bindings: HotkeyBinding[]) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when typing in text inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      for (const b of bindings) {
        const ctrlMatch = (b.ctrl ?? false) === (e.ctrlKey || e.metaKey);
        const shiftMatch = (b.shift ?? false) === e.shiftKey;
        const altMatch = (b.alt ?? false) === e.altKey;
        const keyMatch = e.key.toLowerCase() === b.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          if (b.unlessTextSelected) {
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed) return;
          }
          e.preventDefault();
          b.handler(e);
          return;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [bindings]);
}
