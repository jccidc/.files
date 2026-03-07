import { usePanelsStore } from '../../stores/panels';
import { useLayoutStore } from '../../stores/layout';
import { ExplorerTab } from '../explorer/ExplorerTab';
import { TerminalTab } from '../terminal/TerminalTab';
import { PreviewRenderer } from '../preview/PreviewRenderer';
import { PanelTabBar } from './PanelTabBar';

interface Props {
  panelId: string;
}

export function PanelContent({ panelId }: Props) {
  const panel = usePanelsStore((s) => s.panels[panelId]);
  const closePanel = useLayoutStore((s) => s.closePanel);
  const panelIds = useLayoutStore((s) => s.getPanelIds());
  const focusPanel = usePanelsStore((s) => s.focusPanel);

  const activeTab = panel?.tabs.find((t) => t.id === panel.activeTabId);
  const canClose = panelIds.length > 1;

  // Auto-close empty panels (when last tab is closed)
  if (panel && panel.tabs.length === 0 && canClose) {
    // Defer to avoid state update during render
    setTimeout(() => closePanel(panelId), 0);
    return null;
  }

  return (
    <div
      onClick={() => focusPanel(panelId)}
      style={{
        display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
        minWidth: 200, minHeight: 120,
      }}
    >
      <PanelTabBar panelId={panelId} />
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab?.type === 'explorer' && (
          <ExplorerTab key={activeTab.id} tab={activeTab} panelId={panelId} />
        )}
        {activeTab?.type === 'terminal' && (
          <TerminalTab key={activeTab.id} tab={activeTab} />
        )}
        {activeTab?.type === 'preview' && activeTab.previewPath && (
          <PreviewRenderer
            key={activeTab.id}
            entry={{
              name: activeTab.title,
              path: activeTab.previewPath,
              is_dir: false,
              is_hidden: false,
              is_symlink: false,
              size: 0,
              modified: '',
              created: '',
              extension: activeTab.previewPath.split('.').pop() || null,
              readonly: false,
            }}
          />
        )}
        {!activeTab && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--t3)', fontSize: 13,
          }}>
            No open tabs
          </div>
        )}
      </div>
    </div>
  );
}
