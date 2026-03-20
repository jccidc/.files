import { useState, useEffect, useRef, useCallback } from 'react';
import type { FileEntry } from '../../types';

interface TreemapViewProps {
  rootPath: string;
  onNavigate: (path: string) => void;
  onOpenFile: (entry: FileEntry) => void;
  onContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
}

interface TreeNode {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  extension: string | null;
  children?: TreeNode[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  node: TreeNode;
}

// Size-based color gradient: blue (tiny) → cyan → green → yellow → orange → red (huge)
const SIZE_STOPS = [
  { threshold: 1024,                  color: [100, 149, 237] },  // < 1 KB — cornflower blue
  { threshold: 100 * 1024,            color: [72, 209, 204] },   // < 100 KB — teal
  { threshold: 1024 * 1024,           color: [76, 175, 80] },    // < 1 MB — green
  { threshold: 10 * 1024 * 1024,      color: [205, 220, 57] },   // < 10 MB — lime
  { threshold: 100 * 1024 * 1024,     color: [255, 193, 7] },    // < 100 MB — amber
  { threshold: 1024 * 1024 * 1024,    color: [255, 87, 34] },    // < 1 GB — deep orange
  { threshold: Infinity,              color: [244, 67, 54] },    // 1 GB+ — red
];

function getSizeColor(bytes: number): string {
  // Find which two stops we're between and lerp
  for (let i = 0; i < SIZE_STOPS.length; i++) {
    if (bytes < SIZE_STOPS[i].threshold) {
      if (i === 0) {
        const [r, g, b] = SIZE_STOPS[0].color;
        return `rgb(${r},${g},${b})`;
      }
      const prev = SIZE_STOPS[i - 1];
      const curr = SIZE_STOPS[i];
      // Calculate 0-1 position between prev and curr thresholds
      const range = curr.threshold === Infinity ? prev.threshold * 10 : curr.threshold - prev.threshold;
      const pos = Math.min(1, (bytes - prev.threshold) / range);
      // Lerp between colors
      const r = Math.round(prev.color[0] + (curr.color[0] - prev.color[0]) * pos);
      const g = Math.round(prev.color[1] + (curr.color[1] - prev.color[1]) * pos);
      const b = Math.round(prev.color[2] + (curr.color[2] - prev.color[2]) * pos);
      return `rgb(${r},${g},${b})`;
    }
  }
  return 'rgb(244,67,54)';
}

// Folders get a slightly different treatment — same gradient but with more saturation
function getTypeColor(_ext: string | null, isDir: boolean, size: number): string {
  if (isDir) {
    // Folders use the size gradient but slightly more muted
    const base = getSizeColor(size);
    return base;
  }
  // Files also use size gradient
  return getSizeColor(size);
}


function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// Squarified treemap layout algorithm
function squarify(nodes: TreeNode[], x: number, y: number, w: number, h: number): Rect[] {
  if (nodes.length === 0 || w <= 0 || h <= 0) return [];

  const totalSize = nodes.reduce((s, n) => s + n.size, 0);
  if (totalSize === 0) return [];

  const rects: Rect[] = [];
  let remaining = [...nodes].sort((a, b) => b.size - a.size);
  let cx = x, cy = y, cw = w, ch = h;

  while (remaining.length > 0) {
    const isVertical = cw >= ch;
    const side = isVertical ? ch : cw;
    const remainingSize = remaining.reduce((s, n) => s + n.size, 0);

    // Find the best row
    let row: TreeNode[] = [];
    let rowSize = 0;
    let bestRatio = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const test = [...row, remaining[i]];
      const testSize = rowSize + remaining[i].size;
      const rowLength = (testSize / remainingSize) * (isVertical ? cw : ch);

      // Calculate worst aspect ratio in this row
      let worstRatio = 0;
      for (const n of test) {
        const area = (n.size / remainingSize) * cw * ch;
        const nodeW = isVertical ? rowLength : area / (testSize / remainingSize * ch);
        const nodeH = isVertical ? area / rowLength : (testSize / remainingSize) * ch;
        const ratio = Math.max(nodeW / nodeH, nodeH / nodeW);
        worstRatio = Math.max(worstRatio, ratio);
      }

      if (worstRatio <= bestRatio || row.length === 0) {
        bestRatio = worstRatio;
        row = test;
        rowSize = testSize;
      } else {
        break;
      }
    }

    // Layout the row
    const rowFraction = rowSize / remainingSize;
    const rowLength = isVertical ? cw * rowFraction : ch * rowFraction;
    let offset = 0;

    for (const node of row) {
      const nodeFraction = node.size / rowSize;
      const nodeLength = side * nodeFraction;

      if (isVertical) {
        rects.push({ x: cx, y: cy + offset, w: rowLength, h: nodeLength, node });
      } else {
        rects.push({ x: cx + offset, y: cy, w: nodeLength, h: rowLength, node });
      }
      offset += nodeLength;
    }

    // Update remaining area
    if (isVertical) {
      cx += rowLength;
      cw -= rowLength;
    } else {
      cy += rowLength;
      ch -= rowLength;
    }

    remaining = remaining.filter(n => !row.includes(n));
  }

  return rects;
}

export function TreemapView({ rootPath, onNavigate, onOpenFile, onContextMenu }: TreemapViewProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ path: string; name: string }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 500 });

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height - 32 }); // subtract breadcrumb bar
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const loadPath = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const { readDir } = await import('../../api/filesystem');
      const { useSettingsStore } = await import('../../stores/settings');
      const showHidden = useSettingsStore.getState().settings.show_hidden;
      const listing = await readDir(path, showHidden);

      // Get sizes for folders
      const folders = listing.entries.filter(e => e.is_dir);
      const files = listing.entries.filter(e => !e.is_dir);

      let folderSizes: Record<string, number> = {};
      if (folders.length > 0) {
        try {
          const { batchFolderSizes } = await import('../../api/filesystem');
          const sizes = await batchFolderSizes(folders.map(f => f.path));
          for (const [p, s] of sizes) { folderSizes[p] = s; }
        } catch {}
      }

      const treeNodes: TreeNode[] = [
        ...folders.map(f => ({
          name: f.name,
          path: f.path,
          size: folderSizes[f.path] || 0,
          is_dir: true,
          extension: null,
        })),
        ...files.map(f => ({
          name: f.name,
          path: f.path,
          size: f.size,
          is_dir: false,
          extension: f.extension || null,
        })),
      ].filter(n => n.size > 0);

      setNodes(treeNodes);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    setBreadcrumbs([{ path: rootPath, name: rootPath.replace(/.*[\\/]/, '') || rootPath }]);
    loadPath(rootPath);
  }, [rootPath, loadPath]);

  const handleClick = (node: TreeNode) => {
    if (node.is_dir) {
      setBreadcrumbs(prev => [...prev, { path: node.path, name: node.name }]);
      loadPath(node.path);
      onNavigate(node.path);
    } else {
      onOpenFile(node as any);
    }
  };

  const handleBreadcrumb = (idx: number) => {
    const target = breadcrumbs[idx];
    setBreadcrumbs(prev => prev.slice(0, idx + 1));
    loadPath(target.path);
  };

  const rects = squarify(nodes, 0, 0, dims.w, dims.h);

  return (
    <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Breadcrumb bar */}
      <div style={{
        height: 32, minHeight: 32, display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 4, background: 'var(--deep)',
        borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--t3)',
      }}>
        {breadcrumbs.map((bc, idx) => (
          <span key={bc.path}>
            {idx > 0 && <span style={{ margin: '0 4px' }}>/</span>}
            <span
              onClick={() => handleBreadcrumb(idx)}
              style={{
                cursor: 'pointer', color: idx === breadcrumbs.length - 1 ? 'var(--t1)' : 'var(--t3)',
                fontWeight: idx === breadcrumbs.length - 1 ? 500 : 400,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = idx === breadcrumbs.length - 1 ? 'var(--t1)' : 'var(--t3)'; }}
            >
              {bc.name}
            </span>
          </span>
        ))}
      </div>

      {/* Treemap */}
      {loading && <div style={{ padding: 24, color: 'var(--t3)', textAlign: 'center' }}>Calculating sizes...</div>}
      {!loading && (
        <div style={{ position: 'relative', width: dims.w, height: dims.h }}>
          {rects.map((rect) => {
            const isHovered = hovered === rect.node.path;
            const color = getTypeColor(rect.node.extension, rect.node.is_dir, rect.node.size);
            const showLabel = rect.w > 40 && rect.h > 20;
            const showSize = rect.w > 60 && rect.h > 32;
            return (
              <div
                key={rect.node.path}
                onClick={() => handleClick(rect.node)}
                onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, rect.node as any); }}
                onMouseEnter={() => setHovered(rect.node.path)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  position: 'absolute',
                  left: rect.x + 1,
                  top: rect.y + 1,
                  width: Math.max(0, rect.w - 2),
                  height: Math.max(0, rect.h - 2),
                  background: color,
                  opacity: isHovered ? 1 : 0.75,
                  borderRadius: 2,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  padding: showLabel ? 4 : 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  transition: 'opacity 0.1s',
                  border: isHovered ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(0,0,0,0.2)',
                }}
                title={`${rect.node.name}\n${formatSize(rect.node.size)}`}
              >
                {showLabel && (
                  <div style={{
                    fontSize: Math.min(11, rect.w / 8),
                    color: '#fff',
                    fontWeight: 600,
                    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {rect.node.name}
                  </div>
                )}
                {showSize && (
                  <div style={{
                    fontSize: Math.min(9, rect.w / 10),
                    color: 'rgba(255,255,255,0.7)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                  }}>
                    {formatSize(rect.node.size)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Size legend */}
      {!loading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '6px 12px', background: 'var(--deep)',
          borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--t3)',
        }}>
          <span>Size:</span>
          {[
            { label: '< 1 KB', color: 'rgb(100,149,237)' },
            { label: '100 KB', color: 'rgb(72,209,204)' },
            { label: '1 MB', color: 'rgb(76,175,80)' },
            { label: '10 MB', color: 'rgb(205,220,57)' },
            { label: '100 MB', color: 'rgb(255,193,7)' },
            { label: '1 GB', color: 'rgb(255,87,34)' },
            { label: '1 GB+', color: 'rgb(244,67,54)' },
          ].map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
              <span>{s.label}</span>
            </div>
          ))}
          <span style={{ marginLeft: 'auto' }}>{nodes.length} items</span>
        </div>
      )}
    </div>
  );
}
