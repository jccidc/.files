import { useRef } from 'react';
import { useLayoutStore } from '../../stores/layout';
import { PanelContent } from './PanelContent';
import { PanelSplitter } from './PanelSplitter';
import type { LayoutNode } from '../../types';

function LayoutRenderer({ node }: { node: LayoutNode }) {
  const setRatio = useLayoutStore((s) => s.setRatio);
  const resetRatio = useLayoutStore((s) => s.resetRatio);
  const containerRef = useRef<HTMLDivElement | null>(null);

  if (node.type === 'leaf') {
    return <PanelContent panelId={node.panelId} />;
  }

  const isHorizontal = node.direction === 'horizontal';
  const firstSize = `${node.ratio * 100}%`;
  const secondSize = `${(1 - node.ratio) * 100}%`;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <div style={{
        [isHorizontal ? 'width' : 'height']: `calc(${firstSize} - 2px)`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minWidth: isHorizontal ? 200 : undefined,
        minHeight: isHorizontal ? undefined : 120,
      }}>
        <LayoutRenderer node={node.first} />
      </div>
      <PanelSplitter
        direction={node.direction}
        splitId={node.id}
        onResize={setRatio}
        onReset={resetRatio}
        containerRef={containerRef}
      />
      <div style={{
        [isHorizontal ? 'width' : 'height']: `calc(${secondSize} - 2px)`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minWidth: isHorizontal ? 200 : undefined,
        minHeight: isHorizontal ? undefined : 120,
      }}>
        <LayoutRenderer node={node.second} />
      </div>
    </div>
  );
}

export function PanelContainer() {
  const tree = useLayoutStore((s) => s.tree);

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <LayoutRenderer node={tree} />
    </div>
  );
}
