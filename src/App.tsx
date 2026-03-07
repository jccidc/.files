import { useEffect, useState, useMemo } from 'react';
import './theme/tokens.css';
import { Titlebar } from './components/titlebar/Titlebar';
import { Sidebar } from './components/sidebar/Sidebar';
import { StatusBar } from './components/common/StatusBar';
import { CommandPalette } from './components/common/CommandPalette';
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

function App() {
  const sidebarVisible = useLayoutStore((s) => s.sidebarVisible);
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const load = useSettingsStore((s) => s.load);
  const refresh = useExplorerStore((s) => s.refresh);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const previewPanelVisible = usePreviewStore((s) => s.panelVisible);
  const togglePreviewPanel = usePreviewStore((s) => s.togglePanel);

  const splitPanel = useLayoutStore((s) => s.splitPanel);

  useTheme();

  // Initialize default panel on first launch
  useEffect(() => {
    load();
    const panels = usePanelsStore.getState().panels;
    if (!panels[DEFAULT_PANEL_ID] || Object.keys(panels).length === 0) {
      usePanelsStore.getState().createPanel(DEFAULT_PANEL_ID, [
        { id: crypto.randomUUID(), type: 'explorer', title: 'Explorer', path: 'C:\\', pinned: false },
      ]);
    }
  }, []);

  const hotkeys = useMemo(
    () => [
      {
        key: 'k',
        ctrl: true,
        handler: () => setPaletteOpen(true),
      },
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
        handler: () => useExplorerStore.getState().selectAll(),
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
    ],
    [toggleSidebar, refresh, splitPanel, togglePreviewPanel],
  );

  useHotkeys(hotkeys);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Titlebar onOpenSettings={() => setSettingsOpen(true)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sidebarVisible && <Sidebar />}
        <PanelContainer />
        {previewPanelVisible && <PreviewPanel />}
      </div>
      <StatusBar />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <FuzzySearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default App;
