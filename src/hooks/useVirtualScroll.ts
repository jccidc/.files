import { useState, useCallback, useRef, useEffect } from 'react';

interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  offsetY: number;
  visibleCount: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export function useVirtualScroll(
  totalItems: number,
  rowHeight: number,
  overscan: number = 5,
): VirtualScrollResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const roRef = useRef<ResizeObserver | null>(null);
  const observedRef = useRef<HTMLDivElement | null>(null);

  // Containers often mount late (behind loading/error states) or swap on view
  // changes, so re-check the ref after every render instead of only on mount.
  useEffect(() => {
    const el = containerRef.current;
    if (el === observedRef.current) return;
    roRef.current?.disconnect();
    roRef.current = null;
    observedRef.current = el;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    roRef.current = ro;
    setContainerHeight(el.clientHeight);
    setScrollTop(el.scrollTop);
  });

  useEffect(() => {
    return () => roRef.current?.disconnect();
  }, []);

  // Re-read the element's real scrollTop whenever the item count changes:
  // the browser silently clamps scrollTop when content shrinks (no scroll
  // event fires), and consumers can toggle totalItems 0 <-> N, so state
  // would otherwise go stale and render an empty/offset slice.
  useEffect(() => {
    const el = containerRef.current;
    if (el) setScrollTop(el.scrollTop);
  }, [totalItems]);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = totalItems * rowHeight;
  const visibleCount = Math.ceil(containerHeight / rowHeight);
  const rawStart = Math.floor(scrollTop / rowHeight);
  const startIndex = Math.max(0, rawStart - overscan);
  const endIndex = Math.min(totalItems, rawStart + visibleCount + overscan);
  const offsetY = startIndex * rowHeight;

  return {
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    visibleCount,
    containerRef,
    onScroll,
  };
}
