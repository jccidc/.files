import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
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
  const customStyleRef = useRef<HTMLStyleElement | null>(null);
  const cursorTrailRef = useRef<HTMLCanvasElement | null>(null);

  // Theme + accent
  useEffect(() => {
    const tokens = resolveTheme(theme, customThemes || []);
    applyTheme(tokens, accentColor || undefined);
  }, [theme, accentColor, customThemes]);

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

    // Glow
    r.classList.toggle('glow-enabled', enableGlow !== false);
  }, [sidebarOpacity, toolbarOpacity, terminalOpacity, baseOpacity, blurAmount, borderRadius, animationSpeed, enableAnimations, density, enableGlow, fontSize]);

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
