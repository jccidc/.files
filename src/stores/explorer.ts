import { create } from 'zustand';
import type { FileEntry } from '../types';
import { readDir } from '../api/filesystem';
import { copyFiles, moveFiles } from '../api/shell';
import { useSettingsStore } from './settings';

export type ViewMode = 'list' | 'grid';

export interface TabExplorerState {
  currentPath: string;
  entries: FileEntry[];
  selectedPaths: Set<string>;
  loading: boolean;
  error: string | null;
  viewMode: ViewMode;
  history: string[];
  historyIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;
}

const DEFAULT_TAB_STATE: TabExplorerState = {
  currentPath: 'C:\\',
  entries: [],
  selectedPaths: new Set(),
  loading: false,
  error: null,
  viewMode: 'list',
  history: ['C:\\'],
  historyIndex: 0,
  canGoBack: false,
  canGoForward: false,
};

function createTabState(initialPath?: string): TabExplorerState {
  const path = initialPath || 'C:\\';
  return { ...DEFAULT_TAB_STATE, currentPath: path, history: [path], selectedPaths: new Set() };
}

interface ExplorerStore {
  tabStates: Record<string, TabExplorerState>;
  activeTabId: string | null;
  clipboardPaths: string[];
  clipboardMode: 'copy' | 'cut' | null;

  // Tab lifecycle
  initTab: (tabId: string, initialPath?: string) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;

  // Per-tab actions
  navigate: (tabId: string, path: string) => Promise<void>;
  refresh: (tabId: string) => Promise<void>;
  setSelected: (tabId: string, paths: Set<string>) => void;
  toggleSelected: (tabId: string, path: string) => void;
  selectAll: (tabId: string) => void;
  clearSelection: (tabId: string) => void;
  setViewMode: (tabId: string, mode: ViewMode) => void;
  goBack: (tabId: string) => Promise<void>;
  goForward: (tabId: string) => Promise<void>;
  goUp: (tabId: string) => Promise<void>;
  goHome: (tabId: string) => Promise<void>;

  // Global clipboard
  copyPaths: (paths: string[]) => void;
  cutPaths: (paths: string[]) => void;
  paste: (tabId: string) => Promise<void>;

  // Helper
  getTab: (tabId: string) => TabExplorerState;
}

export const useExplorerStore = create<ExplorerStore>((set, get) => {
  const getTabState = (tabId: string): TabExplorerState =>
    get().tabStates[tabId] ?? DEFAULT_TAB_STATE;

  const updateTab = (tabId: string, patch: Partial<TabExplorerState>) => {
    set((s) => ({
      tabStates: {
        ...s.tabStates,
        [tabId]: { ...(s.tabStates[tabId] ?? createTabState()), ...patch },
      },
    }));
  };

  const SPECIAL_PATHS = ['this-pc', 'recycle-bin'];

  const loadPath = async (tabId: string, path: string) => {
    // Special virtual paths don't load a directory
    if (SPECIAL_PATHS.includes(path)) {
      updateTab(tabId, { currentPath: path, entries: [], selectedPaths: new Set(), loading: false, error: null });
      return;
    }
    const showHidden = useSettingsStore.getState().settings.show_hidden;
    updateTab(tabId, { loading: true, error: null });
    try {
      const listing = await readDir(path, showHidden);
      updateTab(tabId, {
        currentPath: listing.path,
        entries: listing.entries,
        selectedPaths: new Set(),
        loading: false,
      });
    } catch (e) {
      updateTab(tabId, { error: String(e), loading: false });
    }
  };

  return {
    tabStates: {},
    activeTabId: null,
    clipboardPaths: [],
    clipboardMode: null,

    initTab: (tabId, initialPath) => {
      const existing = get().tabStates[tabId];
      if (!existing) {
        set((s) => ({
          tabStates: { ...s.tabStates, [tabId]: createTabState(initialPath) },
          activeTabId: s.activeTabId || tabId,
        }));
      }
    },

    removeTab: (tabId) => {
      set((s) => {
        const { [tabId]: _, ...rest } = s.tabStates;
        return {
          tabStates: rest,
          activeTabId: s.activeTabId === tabId
            ? Object.keys(rest)[0] || null
            : s.activeTabId,
        };
      });
    },

    setActiveTab: (tabId) => set({ activeTabId: tabId }),

    navigate: async (tabId, path) => {
      const tab = getTabState(tabId);
      const newHistory = tab.history.slice(0, tab.historyIndex + 1);
      newHistory.push(path);
      const newIndex = newHistory.length - 1;
      updateTab(tabId, {
        history: newHistory,
        historyIndex: newIndex,
        canGoBack: newIndex > 0,
        canGoForward: false,
      });
      await loadPath(tabId, path);
    },

    refresh: async (tabId) => {
      const tab = getTabState(tabId);
      const showHidden = useSettingsStore.getState().settings.show_hidden;
      updateTab(tabId, { loading: true, error: null });
      try {
        const listing = await readDir(tab.currentPath, showHidden);
        updateTab(tabId, { entries: listing.entries, loading: false });
      } catch (e) {
        updateTab(tabId, { error: String(e), loading: false });
      }
    },

    goBack: async (tabId) => {
      const tab = getTabState(tabId);
      if (tab.historyIndex <= 0) return;
      const newIndex = tab.historyIndex - 1;
      updateTab(tabId, {
        historyIndex: newIndex,
        canGoBack: newIndex > 0,
        canGoForward: newIndex < tab.history.length - 1,
      });
      await loadPath(tabId, tab.history[newIndex]);
    },

    goForward: async (tabId) => {
      const tab = getTabState(tabId);
      if (tab.historyIndex >= tab.history.length - 1) return;
      const newIndex = tab.historyIndex + 1;
      updateTab(tabId, {
        historyIndex: newIndex,
        canGoBack: newIndex > 0,
        canGoForward: newIndex < tab.history.length - 1,
      });
      await loadPath(tabId, tab.history[newIndex]);
    },

    goUp: async (tabId) => {
      const tab = getTabState(tabId);
      const parent = tab.currentPath.replace(/\\[^\\]+\\?$/, '') || 'C:\\';
      if (parent !== tab.currentPath) {
        await get().navigate(tabId, parent);
      }
    },

    goHome: async (tabId) => {
      const tab = getTabState(tabId);
      const match = tab.currentPath.match(/^([A-Z]:\\Users\\[^\\]+)/i);
      const home = match ? match[1] : 'C:\\Users\\Public';
      await get().navigate(tabId, home);
    },

    setSelected: (tabId, paths) => updateTab(tabId, { selectedPaths: paths }),

    toggleSelected: (tabId, path) => {
      const tab = getTabState(tabId);
      const next = new Set(tab.selectedPaths);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      updateTab(tabId, { selectedPaths: next });
    },

    selectAll: (tabId) => {
      const tab = getTabState(tabId);
      updateTab(tabId, { selectedPaths: new Set(tab.entries.map((e) => e.path)) });
    },

    clearSelection: (tabId) => updateTab(tabId, { selectedPaths: new Set() }),

    setViewMode: (tabId, mode) => updateTab(tabId, { viewMode: mode }),

    copyPaths: (paths) => set({ clipboardPaths: paths, clipboardMode: 'copy' }),
    cutPaths: (paths) => set({ clipboardPaths: paths, clipboardMode: 'cut' }),

    paste: async (tabId) => {
      const { clipboardPaths, clipboardMode } = get();
      const tab = getTabState(tabId);
      if (!clipboardPaths.length || !clipboardMode) return;
      try {
        if (clipboardMode === 'copy') {
          await copyFiles(clipboardPaths, tab.currentPath);
        } else {
          await moveFiles(clipboardPaths, tab.currentPath);
          set({ clipboardPaths: [], clipboardMode: null });
        }
        await get().refresh(tabId);
      } catch (e) {
        updateTab(tabId, { error: String(e) });
      }
    },

    getTab: (tabId) => getTabState(tabId),
  };
});

/**
 * Hook to get the active (focused) tab's explorer state.
 * Used by Sidebar, StatusBar, GitPanel, etc. that don't have a specific tabId.
 */
export function useActiveExplorerState(): TabExplorerState & { tabId: string | null } {
  const activeTabId = useExplorerStore((s) => s.activeTabId);
  const tabState = useExplorerStore((s) =>
    s.activeTabId ? s.tabStates[s.activeTabId] ?? DEFAULT_TAB_STATE : DEFAULT_TAB_STATE,
  );
  return { ...tabState, tabId: activeTabId };
}
