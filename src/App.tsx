import { useEffect, useState, useMemo } from 'react';
import { listen } from '@tauri-apps/api/event';
import './theme/tokens.css';
import { Titlebar, FooterWidgets } from './components/titlebar/Titlebar';
import { Sidebar } from './components/sidebar/Sidebar';
import { StatusBar } from './components/common/StatusBar';
import { FuzzySearch } from './components/common/FuzzySearch';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { PanelContainer } from './components/layout/PanelContainer';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { useHotkeys } from './hooks/useHotkeys';
import { useTheme } from './hooks/useTheme';
import { useLayoutStore, DEFAULT_PANEL_ID } from './stores/layout';
import { useSettingsStore } from './stores/settings';
import { useExplorerStore } from './stores/explorer';
import { usePanelsStore } from './stores/panels';
import { usePreviewStore } from './stores/preview';
import { ProgressPanel } from './components/common/ProgressPanel';

function App() {
  const sidebarVisible = useLayoutStore((s) => s.sidebarVisible);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const load = useSettingsStore((s) => s.load);
  const activeTabId = useExplorerStore((s) => s.activeTabId);
  const refresh = () => {
    const tid = useExplorerStore.getState().activeTabId;
    if (tid) useExplorerStore.getState().refresh(tid);
  };
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const previewPanelVisible = usePreviewStore((s) => s.panelVisible);
  const togglePreviewPanel = usePreviewStore((s) => s.togglePanel);

  const splitPanel = useLayoutStore((s) => s.splitPanel);

  useTheme();

  // Listen for search event from toolbar
  useEffect(() => {
    const handler = () => setSearchOpen(true);
    window.addEventListener('open-fuzzy-search', handler);
    return () => window.removeEventListener('open-fuzzy-search', handler);
  }, []);

  // Initialize default panel on first launch
  useEffect(() => {
    load();
    // Ensure a default tab exists — runs both immediately and after persist hydration
    const ensureDefaultTab = () => {
      const panels = usePanelsStore.getState().panels;
      const defaultPanel = panels[DEFAULT_PANEL_ID];
      if (!defaultPanel || Object.keys(panels).length === 0) {
        usePanelsStore.getState().createPanel(DEFAULT_PANEL_ID, [
          { id: crypto.randomUUID(), type: 'explorer', title: 'Explorer', path: 'C:\\', pinned: false },
        ]);
      } else if (defaultPanel.tabs.length === 0) {
        usePanelsStore.getState().addTab(DEFAULT_PANEL_ID, {
          id: crypto.randomUUID(), type: 'explorer', title: 'Explorer', path: 'C:\\', pinned: false,
        });
      }
    };
    ensureDefaultTab();
    // Also run after persist hydration which may overwrite initial state
    const unsub = usePanelsStore.persist.onFinishHydration(() => {
      ensureDefaultTab();
    });
    return () => unsub();
  }, []);

  // Listen for single-instance folder open
  useEffect(() => {
    const unlisten = listen<string>('open-folder', (event) => {
      const folderPath = event.payload;
      if (!folderPath) return;
      const pid = usePanelsStore.getState().focusedPanelId || DEFAULT_PANEL_ID;
      usePanelsStore.getState().addTab(pid, {
        id: crypto.randomUUID(),
        type: 'explorer',
        title: folderPath.split('\\').pop() || 'Explorer',
        path: folderPath,
        pinned: false,
      });
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const hotkeys = useMemo(
    () => [
      {
        key: 't',
        ctrl: true,
        handler: () => {
          const pid = usePanelsStore.getState().focusedPanelId || DEFAULT_PANEL_ID;
          usePanelsStore.getState().addTab(pid, {
            id: crypto.randomUUID(), type: 'explorer', title: 'Explorer', path: 'C:\\', pinned: false,
          });
        },
      },
      {
        key: 't',
        ctrl: true,
        shift: true,
        handler: () => {
          const pid = usePanelsStore.getState().focusedPanelId || DEFAULT_PANEL_ID;
          usePanelsStore.getState().addTab(pid, {
            id: crypto.randomUUID(), type: 'terminal', title: 'Terminal', pinned: false,
          });
        },
      },
      {
        key: 'w',
        ctrl: true,
        handler: () => {
          const s = usePanelsStore.getState();
          const pid = s.focusedPanelId;
          if (!pid) return;
          const panel = s.panels[pid];
          if (panel?.activeTabId) s.closeTab(pid, panel.activeTabId);
        },
      },
      {
        key: 'b',
        ctrl: true,
        handler: () => toggleSidebar(),
      },
      {
        key: 'F5',
        handler: () => refresh(),
      },
      {
        key: 'p',
        ctrl: true,
        handler: () => setSearchOpen(true),
      },
      {
        key: 'a',
        ctrl: true,
        handler: () => {
          const tid = useExplorerStore.getState().activeTabId;
          if (tid) useExplorerStore.getState().selectAll(tid);
        },
      },
      {
        key: ',',
        ctrl: true,
        handler: () => setSettingsOpen(true),
      },
      {
        // Split right
        key: 'd',
        ctrl: true,
        shift: true,
        handler: () => {
          const pid = usePanelsStore.getState().focusedPanelId;
          if (!pid) return;
          const newPid = `panel-${crypto.randomUUID().slice(0, 8)}`;
          usePanelsStore.getState().createPanel(newPid, [
            { id: crypto.randomUUID(), type: 'explorer', title: 'Explorer', path: 'C:\\', pinned: false },
          ]);
          splitPanel(pid, 'horizontal', newPid);
        },
      },
      {
        // Split down
        key: 's',
        ctrl: true,
        shift: true,
        handler: () => {
          const pid = usePanelsStore.getState().focusedPanelId;
          if (!pid) return;
          const newPid = `panel-${crypto.randomUUID().slice(0, 8)}`;
          usePanelsStore.getState().createPanel(newPid, [
            { id: crypto.randomUUID(), type: 'explorer', title: 'Explorer', path: 'C:\\', pinned: false },
          ]);
          splitPanel(pid, 'vertical', newPid);
        },
      },
      {
        key: 'p',
        ctrl: true,
        shift: true,
        handler: () => togglePreviewPanel(),
      },
      {
        key: 'ArrowLeft',
        alt: true,
        handler: () => {
          const tid = useExplorerStore.getState().activeTabId;
          if (tid) useExplorerStore.getState().goBack(tid);
        },
      },
      {
        key: 'ArrowRight',
        alt: true,
        handler: () => {
          const tid = useExplorerStore.getState().activeTabId;
          if (tid) useExplorerStore.getState().goForward(tid);
        },
      },
      {
        key: 'ArrowUp',
        alt: true,
        handler: () => {
          const tid = useExplorerStore.getState().activeTabId;
          if (tid) useExplorerStore.getState().goUp(tid);
        },
      },
      {
        key: 'Home',
        alt: true,
        handler: () => {
          const tid = useExplorerStore.getState().activeTabId;
          if (tid) useExplorerStore.getState().goHome(tid);
        },
      },
      {
        key: 'c',
        ctrl: true,
        unlessTextSelected: true,
        handler: () => {
          const s = useExplorerStore.getState();
          const tid = s.activeTabId;
          if (!tid) return;
          const sel = s.getTab(tid).selectedPaths;
          if (sel.size > 0) s.copyPaths([...sel]);
        },
      },
      {
        key: 'x',
        ctrl: true,
        unlessTextSelected: true,
        handler: () => {
          const s = useExplorerStore.getState();
          const tid = s.activeTabId;
          if (!tid) return;
          const sel = s.getTab(tid).selectedPaths;
          if (sel.size > 0) s.cutPaths([...sel]);
        },
      },
      {
        key: 'v',
        ctrl: true,
        handler: () => {
          const tid = useExplorerStore.getState().activeTabId;
          if (tid) useExplorerStore.getState().paste(tid);
        },
      },
    ],
    [toggleSidebar, refresh, splitPanel, togglePreviewPanel, activeTabId],
  );

  useHotkeys(hotkeys);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Background base color — opacity controlled by settings, blur by DWM effect */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'var(--base-bg, var(--void))' }} />
      {/* Background pattern overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'var(--bg-pattern)',
        backgroundSize: 'var(--bg-pattern-size)',
        opacity: 'var(--bg-opacity)' as any,
      }} />
      {/* App content — above background layers */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <Titlebar onOpenSettings={() => setSettingsOpen(true)} />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {sidebarVisible && <Sidebar />}
          <PanelContainer />
          {previewPanelVisible && <PreviewPanel />}
        </div>
        <StatusBar />
        <FooterWidgets />
      </div>
      <FuzzySearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ProgressPanel />
    </div>
  );
}

export default App;
