import { useEffect } from 'react';

interface HotkeyBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
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
