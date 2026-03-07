import { useRef } from 'react';
import type { SplitDirection } from '../../types';

interface Props {
  direction: SplitDirection;
  splitId: string;
  onResize: (splitId: string, ratio: number) => void;
  onReset: (splitId: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function PanelSplitter({ direction, splitId, onResize, onReset, containerRef }: Props) {
  const dragging = useRef(false);

  const isHorizontal = direction === 'horizontal'; // side by side
  const cursor = isHorizontal ? 'col-resize' : 'row-resize';

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      let ratio: number;
      if (isHorizontal) {
        ratio = (ev.clientX - rect.left) / rect.width;
      } else {
        ratio = (ev.clientY - rect.top) / rect.height;
      }
      onResize(splitId, ratio);
    };

    const handleMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = cursor;
    document.body.style.userSelect = 'none';
  };

  const handleDoubleClick = () => {
    onReset(splitId);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'relative',
        zIndex: 20,
        flexShrink: 0,
        ...(isHorizontal
          ? { width: 4, cursor, minHeight: '100%' }
          : { height: 4, cursor, minWidth: '100%' }),
        background: 'var(--border)',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
      onMouseLeave={(e) => { if (!dragging.current) e.currentTarget.style.background = 'var(--border)'; }}
    />
  );
}
