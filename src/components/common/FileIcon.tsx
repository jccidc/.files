import { useMemo } from 'react';
import { useSettingsStore } from '../../stores/settings';
import { getIcon } from 'material-file-icons';
import type { FileEntry } from '../../types';

const RAINBOW_PALETTE = ['#F87171', '#FB923C', '#FACC15', '#4ADE80', '#22D3EE', '#818CF8', '#E879F9'];

// Deterministic color from folder name
function rainbowColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return RAINBOW_PALETTE[Math.abs(hash) % RAINBOW_PALETTE.length];
}

// Smaller icon for list view (16x16 at 100% icon scale)
export function FileIcon({ entry, size }: { entry: FileEntry; size?: number }) {
  const iconTheme = useSettingsStore((s) => s.settings.icon_theme) || 'minimal';
  const rainbowFolders = useSettingsStore((s) => s.settings.rainbow_folders);
  const iconScale = useSettingsStore((s) => s.settings.icon_scale);
  // No explicit size = list-view default, which follows the Icon Size setting
  // (grid/tiles pass explicit pre-scaled sizes)
  size = size ?? Math.round(16 * ((iconScale || 100) / 100));
  // Must call hooks unconditionally (React rules of hooks)
  const materialSvg = useMemo(() => {
    if (entry.is_dir || (entry.extension || '').toLowerCase() === 'lnk') return '';
    return getIcon(entry.name).svg;
  }, [entry.name, entry.is_dir, entry.extension]);

  // Folders -- keep existing SVG icons
  if (entry.is_dir) {
    const baseColor = iconTheme === 'monochrome' ? 'var(--t2)' : 'var(--warm)';
    const color = rainbowFolders && iconTheme !== 'monochrome' ? rainbowColor(entry.name) : baseColor;
    if (iconTheme === 'monochrome') {
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.2" style={{ flexShrink: 0 }}>
          <path d="M1.5 3a1 1 0 011-1H6l1.5 1.5H13.5a1 1 0 011 1V13a1 1 0 01-1 1h-12a1 1 0 01-1-1V3z" />
        </svg>
      );
    }
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill={color} stroke="none" style={{ flexShrink: 0 }}>
        <path d="M1.5 3a1 1 0 011-1H6l1.5 1.5H13.5a1 1 0 011 1V13a1 1 0 01-1 1h-12a1 1 0 01-1-1V3z" />
      </svg>
    );
  }

  // .lnk shortcut -- folder with arrow overlay
  if ((entry.extension || '').toLowerCase() === 'lnk') {
    const color = iconTheme === 'monochrome' ? 'var(--t2)' : 'var(--warm)';
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M1.5 3a1 1 0 011-1H6l1.5 1.5H13.5a1 1 0 011 1V13a1 1 0 01-1 1h-12a1 1 0 01-1-1V3z" fill={iconTheme === 'monochrome' ? 'none' : 'var(--warm)'} stroke={iconTheme === 'monochrome' ? color : 'none'} strokeWidth="1.2" opacity="0.7" />
        <path d="M7 7l3 2.5L7 12" stroke="var(--accent)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Monochrome: simple document outline SVG (no color)
  if (iconTheme === 'monochrome') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path d="M4 1.5h5l3.5 3.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1z" stroke="var(--t2)" strokeWidth="1.2" />
        <polyline points="9,1.5 9,5.5 12.5,5.5" fill="none" stroke="var(--t2)" strokeWidth="1.2" />
      </svg>
    );
  }

  // Minimal: material-file-icons with muted/grayscale filter
  if (iconTheme === 'minimal') {
    return (
      <span
        style={{ display: 'inline-flex', flexShrink: 0, width: size, height: size, filter: 'grayscale(1) opacity(0.6)' }}
        dangerouslySetInnerHTML={{ __html: materialSvg }}
      />
    );
  }

  // Colorful: material-file-icons (rich SVGs per file type)
  return (
    <span
      style={{ display: 'inline-flex', flexShrink: 0, width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: materialSvg }}
    />
  );
}
