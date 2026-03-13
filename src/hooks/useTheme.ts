import { useEffect, useRef } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { appConfigDir } from '@tauri-apps/api/path';
import { useSettingsStore } from '../stores/settings';
import { applyTheme, resolveTheme } from '../theme/themes';

export function useTheme() {
  const theme = useSettingsStore((s) => s.settings.theme);
  const accentColor = useSettingsStore((s) => s.settings.accent_color);
  const customThemes = useSettingsStore((s) => s.settings.custom_themes);
  const uiScale = useSettingsStore((s) => s.settings.ui_scale);
  const windowEffect = useSettingsStore((s) => s.settings.window_effect);
  const baseOpacity = useSettingsStore((s) => s.settings.base_opacity);
  const blurAmount = useSettingsStore((s) => s.settings.blur_amount);
  const sidebarOpacity = useSettingsStore((s) => s.settings.sidebar_opacity);
  const toolbarOpacity = useSettingsStore((s) => s.settings.toolbar_opacity);
  const terminalOpacity = useSettingsStore((s) => s.settings.terminal_opacity);
  const enableGlow = useSettingsStore((s) => s.settings.enable_glow);
  const enableCursorTrail = useSettingsStore((s) => s.settings.enable_cursor_trail);
  const enableAnimations = useSettingsStore((s) => s.settings.enable_animations);
  const animationSpeed = useSettingsStore((s) => s.settings.animation_speed);
  const borderRadius = useSettingsStore((s) => s.settings.border_radius);
  const density = useSettingsStore((s) => s.settings.density);
  const fontSize = useSettingsStore((s) => s.settings.font_size);
  const bgPattern = useSettingsStore((s) => s.settings.bg_pattern);
  const bgCustomUrl = useSettingsStore((s) => s.settings.bg_custom_url);
  const bgOpacity = useSettingsStore((s) => s.settings.bg_opacity);
  const customCss = useSettingsStore((s) => s.settings.custom_css);
  const customFonts = useSettingsStore((s) => s.settings.custom_fonts);
  const fontFamily = useSettingsStore((s) => s.settings.font_family);
  // Radical theming
  const accentSecondary = useSettingsStore((s) => s.settings.accent_secondary);
  const gradientAccent = useSettingsStore((s) => s.settings.gradient_accent);
  const selectionGlow = useSettingsStore((s) => s.settings.selection_glow);
  const neonMode = useSettingsStore((s) => s.settings.neon_mode);
  const accentTintedText = useSettingsStore((s) => s.settings.accent_tinted_text);
  const adaptiveAccent = useSettingsStore((s) => s.settings.adaptive_accent);
  const customStyleRef = useRef<HTMLStyleElement | null>(null);
  const fontStyleRef = useRef<HTMLStyleElement | null>(null);
  const radicalStyleRef = useRef<HTMLStyleElement | null>(null);
  const cursorTrailRef = useRef<HTMLCanvasElement | null>(null);

  // Theme + accent
  useEffect(() => {
    const tokens = resolveTheme(theme, customThemes || []);
    applyTheme(tokens, accentColor || undefined, accentSecondary || undefined, gradientAccent || false);
  }, [theme, accentColor, accentSecondary, gradientAccent, customThemes]);

  // UI scale
  useEffect(() => {
    document.documentElement.style.fontSize = `${(uiScale / 100) * 13}px`;
  }, [uiScale]);

  // Window vibrancy effect (Tauri native)
  useEffect(() => {
    invoke('set_window_effect', { effect: windowEffect || 'none' }).catch(() => {});
  }, [windowEffect]);

  // CSS custom properties for visual effects
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--sidebar-opacity', String(sidebarOpacity ?? 1));
    r.style.setProperty('--toolbar-opacity', String(toolbarOpacity ?? 1));
    r.style.setProperty('--terminal-opacity', String(terminalOpacity ?? 1));
    // Base layer: computed background with alpha + blur
    r.style.setProperty('--base-bg', `color-mix(in srgb, var(--void) ${(baseOpacity ?? 1) * 100}%, transparent)`);
    r.style.setProperty('--blur-amount', `${blurAmount ?? 20}px`);
    // Compute semi-transparent backgrounds (so only bg fades, not text/icons)
    r.style.setProperty('--sidebar-bg', `color-mix(in srgb, var(--surface) ${(sidebarOpacity ?? 1) * 100}%, transparent)`);
    r.style.setProperty('--toolbar-bg', `color-mix(in srgb, var(--base) ${(toolbarOpacity ?? 1) * 100}%, transparent)`);
    r.style.setProperty('--terminal-bg', `color-mix(in srgb, var(--void) ${(terminalOpacity ?? 1) * 100}%, transparent)`);
    r.style.setProperty('--border-radius', `${borderRadius ?? 8}px`);
    r.style.setProperty('--anim-speed', `${animationSpeed ?? 1}`);
    r.style.setProperty('--anim-duration', enableAnimations ? `${0.15 / (animationSpeed || 1)}s` : '0s');

    // Density
    const densityMap: Record<string, { rowH: string; padY: string; padX: string; gap: string }> = {
      compact:     { rowH: '24px', padY: '2px', padX: '8px',  gap: '4px' },
      comfortable: { rowH: '30px', padY: '5px', padX: '12px', gap: '8px' },
      spacious:    { rowH: '38px', padY: '8px', padX: '16px', gap: '12px' },
    };
    const d = densityMap[density] || densityMap.comfortable;
    r.style.setProperty('--row-height', d.rowH);
    r.style.setProperty('--density-pad-y', d.padY);
    r.style.setProperty('--density-pad-x', d.padX);
    r.style.setProperty('--density-gap', d.gap);

    // Font size
    const fs = fontSize ?? 13;
    r.style.setProperty('--file-font-size', `${fs}px`);
    r.style.setProperty('--file-font-size-sm', `${fs - 1}px`);

    // Font family
    const ff = fontFamily || 'Outfit';
    r.style.setProperty('--font-family', `'${ff}', sans-serif`);

    // Glow
    r.classList.toggle('glow-enabled', enableGlow !== false);
  }, [sidebarOpacity, toolbarOpacity, terminalOpacity, baseOpacity, blurAmount, borderRadius, animationSpeed, enableAnimations, density, enableGlow, fontSize, fontFamily]);

  // Radical theming effects (CSS class toggles + injected styles)
  useEffect(() => {
    const r = document.documentElement;
    r.classList.toggle('neon-mode', neonMode || false);
    r.classList.toggle('accent-tinted-text', accentTintedText || false);
    r.classList.toggle('selection-glow', selectionGlow || false);
    r.classList.toggle('adaptive-accent', adaptiveAccent || false);

    // Inject/update radical styles sheet
    if (!radicalStyleRef.current) {
      radicalStyleRef.current = document.createElement('style');
      radicalStyleRef.current.id = 'dotfiles-radical-css';
      document.head.appendChild(radicalStyleRef.current);
    }

    const accent = accentColor || '#3B82F6';
    const hexR = (hex: string) => parseInt(hex.slice(1, 3), 16) || 0;
    const hexG = (hex: string) => parseInt(hex.slice(3, 5), 16) || 0;
    const hexB = (hex: string) => parseInt(hex.slice(5, 7), 16) || 0;
    const ar = hexR(accent), ag = hexG(accent), ab = hexB(accent);
    radicalStyleRef.current.textContent = `
      /* Neon mode */
      .neon-mode [data-sidebar] { box-shadow: 1px 0 12px rgba(${ar},${ag},${ab},0.2) !important; border-right: 1px solid ${accent} !important; }
      .neon-mode [data-toolbar] { box-shadow: 0 1px 12px rgba(${ar},${ag},${ab},0.2) !important; border-bottom: 1px solid ${accent} !important; }
      .neon-mode [data-breadcrumb] { border-top: 1px solid ${accent} !important; box-shadow: 0 0 8px rgba(${ar},${ag},${ab},0.15) !important; }
      .neon-mode .file-row-selected .file-name { text-shadow: 0 0 8px rgba(${ar},${ag},${ab},0.5) !important; }

      /* Accent-tinted text */
      .accent-tinted-text .file-name { color: color-mix(in srgb, var(--t2) 70%, ${accent} 30%) !important; }
      .accent-tinted-text .file-row-selected .file-name { color: color-mix(in srgb, var(--t1) 60%, ${accent} 40%) !important; }

      /* Selection glow */
      @keyframes dotfiles-sel-glow {
        0%, 100% { box-shadow: inset 0 0 0 1px ${accent}, 0 0 6px rgba(${ar},${ag},${ab},0.15); }
        50% { box-shadow: inset 0 0 0 1px ${accent}, 0 0 16px rgba(${ar},${ag},${ab},0.25); }
      }
      .selection-glow .file-row-selected { animation: dotfiles-sel-glow 2s ease-in-out infinite !important; border-radius: 3px; }

      /* Adaptive accent: color file names by extension */
      .adaptive-accent [data-ext="js"] .file-name,
      .adaptive-accent [data-ext="mjs"] .file-name,
      .adaptive-accent [data-ext="cjs"] .file-name { color: #FACC15 !important; }
      .adaptive-accent [data-ext="ts"] .file-name { color: #3B82F6 !important; }
      .adaptive-accent [data-ext="tsx"] .file-name,
      .adaptive-accent [data-ext="jsx"] .file-name { color: #38BDF8 !important; }
      .adaptive-accent [data-ext="json"] .file-name,
      .adaptive-accent [data-ext="toml"] .file-name,
      .adaptive-accent [data-ext="yaml"] .file-name,
      .adaptive-accent [data-ext="yml"] .file-name { color: #E4A853 !important; }
      .adaptive-accent [data-ext="md"] .file-name,
      .adaptive-accent [data-ext="txt"] .file-name { color: #9BA3B0 !important; }
      .adaptive-accent [data-ext="html"] .file-name { color: #F97316 !important; }
      .adaptive-accent [data-ext="css"] .file-name,
      .adaptive-accent [data-ext="scss"] .file-name { color: #A78BFA !important; }
      .adaptive-accent [data-ext="rs"] .file-name { color: #F87171 !important; }
      .adaptive-accent [data-ext="py"] .file-name { color: #34D399 !important; }
      .adaptive-accent [data-ext="go"] .file-name { color: #22D3EE !important; }
      .adaptive-accent [data-ext="sh"] .file-name,
      .adaptive-accent [data-ext="bash"] .file-name { color: #22C55E !important; }
      .adaptive-accent [data-ext="png"] .file-name,
      .adaptive-accent [data-ext="jpg"] .file-name,
      .adaptive-accent [data-ext="jpeg"] .file-name,
      .adaptive-accent [data-ext="gif"] .file-name,
      .adaptive-accent [data-ext="svg"] .file-name,
      .adaptive-accent [data-ext="webp"] .file-name { color: #4ADE80 !important; }
      .adaptive-accent [data-ext="zip"] .file-name,
      .adaptive-accent [data-ext="tar"] .file-name,
      .adaptive-accent [data-ext="gz"] .file-name,
      .adaptive-accent [data-ext="rar"] .file-name,
      .adaptive-accent [data-ext="7z"] .file-name { color: #FB923C !important; }
      .adaptive-accent [data-ext="exe"] .file-name,
      .adaptive-accent [data-ext="msi"] .file-name { color: #F87171 !important; }
      .adaptive-accent [data-ext="gpc"] .file-name { color: #E879F9 !important; }
      .adaptive-accent [data-ext="xml"] .file-name { color: #818CF8 !important; }
      .adaptive-accent [data-ext="sql"] .file-name { color: #22D3EE !important; }
    `;

    return () => {
      if (radicalStyleRef.current) {
        radicalStyleRef.current.remove();
        radicalStyleRef.current = null;
      }
    };
  }, [neonMode, accentTintedText, selectionGlow, adaptiveAccent, accentColor]);

  // Background pattern
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--bg-opacity', String(bgOpacity ?? 0.05));

    const patterns: Record<string, string> = {
      none: 'none',
      dots: `radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)`,
      grid: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
      noise: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E")`,
      gradient: `linear-gradient(135deg, var(--accent) 0%, transparent 60%)`,
      custom: bgCustomUrl ? `url("${bgCustomUrl}")` : 'none',
    };
    r.style.setProperty('--bg-pattern', patterns[bgPattern] || 'none');

    const sizes: Record<string, string> = {
      dots: '20px 20px',
      grid: '24px 24px, 24px 24px',
      noise: '200px 200px',
      gradient: '100% 100%',
      custom: 'cover',
    };
    r.style.setProperty('--bg-pattern-size', sizes[bgPattern] || 'auto');
  }, [bgPattern, bgCustomUrl, bgOpacity]);

  // Custom CSS injection
  useEffect(() => {
    if (!customStyleRef.current) {
      customStyleRef.current = document.createElement('style');
      customStyleRef.current.id = 'dotfiles-custom-css';
      document.head.appendChild(customStyleRef.current);
    }
    customStyleRef.current.textContent = customCss || '';
    return () => {
      if (customStyleRef.current) {
        customStyleRef.current.remove();
        customStyleRef.current = null;
      }
    };
  }, [customCss]);

  // Custom font @font-face injection
  useEffect(() => {
    if (!fontStyleRef.current) {
      fontStyleRef.current = document.createElement('style');
      fontStyleRef.current.id = 'dotfiles-custom-fonts';
      document.head.appendChild(fontStyleRef.current);
    }

    const fonts = customFonts || [];
    if (fonts.length === 0) {
      fontStyleRef.current.textContent = '';
      return;
    }

    (async () => {
      try {
        const configDir = await appConfigDir();
        const rules = fonts.map((f: any) => {
          const url = convertFileSrc(`${configDir}fonts\\${f.file}`);
          return `@font-face { font-family: '${f.name}'; src: url('${url}'); }`;
        }).join('\n');
        if (fontStyleRef.current) {
          fontStyleRef.current.textContent = rules;
        }
      } catch {}
    })();

    return () => {
      if (fontStyleRef.current) {
        fontStyleRef.current.remove();
        fontStyleRef.current = null;
      }
    };
  }, [customFonts]);

  // Cursor trail effect
  useEffect(() => {
    if (!enableCursorTrail) {
      if (cursorTrailRef.current) {
        cursorTrailRef.current.remove();
        cursorTrailRef.current = null;
      }
      return;
    }

    let canvas = cursorTrailRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'cursor-trail';
      canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;';
      document.body.appendChild(canvas);
      cursorTrailRef.current = canvas;
    }

    const ctx = canvas.getContext('2d')!;
    const trail: { x: number; y: number; age: number }[] = [];
    let raf = 0;

    const resize = () => {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: MouseEvent) => {
      trail.push({ x: e.clientX, y: e.clientY, age: 0 });
      if (trail.length > 20) trail.shift();
    };
    document.addEventListener('mousemove', onMove);

    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

    const draw = () => {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i];
        p.age += 0.05;
        const alpha = Math.max(0, 1 - p.age) * 0.4;
        const r = Math.max(0, (1 - p.age) * 6);
        if (alpha <= 0) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `${accent}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.fill();
      }
      // Remove dead particles
      while (trail.length > 0 && trail[0].age >= 1) trail.shift();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', resize);
      if (cursorTrailRef.current) {
        cursorTrailRef.current.remove();
        cursorTrailRef.current = null;
      }
    };
  }, [enableCursorTrail]);
}
