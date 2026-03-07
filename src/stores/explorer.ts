import { create } from 'zustand';
import type { FileEntry } from '../types';
import { readDir } from '../api/filesystem';
import { copyFiles, moveFiles } from '../api/shell';
import { useSettingsStore } from './settings';

export type ViewMode = 'list' | 'grid';

interface ExplorerState {
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
  clipboardPaths: string[];
  clipboardMode: 'copy' | 'cut' | null;
  navigate: (path: string) => Promise<void>;
  refresh: () => Promise<void>;
  setSelected: (paths: Set<string>) => void;
  toggleSelected: (path: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setViewMode: (mode: ViewMode) => void;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  goUp: () => Promise<void>;
  goHome: () => Promise<void>;
  copyPaths: (paths: string[]) => void;
  cutPaths: (paths: string[]) => void;
  paste: () => Promise<void>;
}

export const useExplorerStore = create<ExplorerState>((set, get) => {
  const loadPath = async (path: string) => {
    const showHidden = useSettingsStore.getState().settings.show_hidden;
    set({ loading: true, error: null });
    try {
      const listing = await readDir(path, showHidden);
      set({ currentPath: listing.path, entries: listing.entries, selectedPaths: new Set(), loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  };

  return {
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
    clipboardPaths: [],
    clipboardMode: null,

    navigate: async (path: string) => {
      const { history, historyIndex } = get();
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(path);
      const newIndex = newHistory.length - 1;
      set({
        history: newHistory,
        historyIndex: newIndex,
        canGoBack: newIndex > 0,
        canGoForward: false,
      });
      await loadPath(path);
    },

    refresh: async () => {
      const { currentPath } = get();
      const showHidden = useSettingsStore.getState().settings.show_hidden;
      set({ loading: true, error: null });
      try {
        const listing = await readDir(currentPath, showHidden);
        set({ entries: listing.entries, loading: false });
      } catch (e) {
        set({ error: String(e), loading: false });
      }
    },

    goBack: async () => {
      const { history, historyIndex } = get();
      if (historyIndex <= 0) return;
      const newIndex = historyIndex - 1;
      set({
        historyIndex: newIndex,
        canGoBack: newIndex > 0,
        canGoForward: newIndex < history.length - 1,
      });
      await loadPath(history[newIndex]);
    },

    goForward: async () => {
      const { history, historyIndex } = get();
      if (historyIndex >= history.length - 1) return;
      const newIndex = historyIndex + 1;
      set({
        historyIndex: newIndex,
        canGoBack: newIndex > 0,
        canGoForward: newIndex < history.length - 1,
      });
      await loadPath(history[newIndex]);
    },

    goUp: async () => {
      const { currentPath, navigate } = get();
      const parent = currentPath.replace(/\\[^\\]+\\?$/, '') || 'C:\\';
      if (parent !== currentPath) {
        await navigate(parent);
      }
    },

    goHome: async () => {
      const { currentPath, navigate } = get();
      const match = currentPath.match(/^([A-Z]:\\Users\\[^\\]+)/i);
      const home = match ? match[1] : 'C:\\Users\\Public';
      await navigate(home);
    },

    setSelected: (paths) => set({ selectedPaths: paths }),

    toggleSelected: (path) =>
      set((state) => {
        const next = new Set(state.selectedPaths);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        return { selectedPaths: next };
      }),

    selectAll: () =>
      set((state) => ({
        selectedPaths: new Set(state.entries.map((e) => e.path)),
      })),

    clearSelection: () => set({ selectedPaths: new Set() }),
    setViewMode: (mode) => set({ viewMode: mode }),

    copyPaths: (paths: string[]) => set({ clipboardPaths: paths, clipboardMode: 'copy' }),
    cutPaths: (paths: string[]) => set({ clipboardPaths: paths, clipboardMode: 'cut' }),

    paste: async () => {
      const { clipboardPaths, clipboardMode, currentPath, refresh } = get();
      if (!clipboardPaths.length || !clipboardMode) return;
      try {
        if (clipboardMode === 'copy') {
          await copyFiles(clipboardPaths, currentPath);
        } else {
          await moveFiles(clipboardPaths, currentPath);
          set({ clipboardPaths: [], clipboardMode: null });
        }
        await refresh();
      } catch (e) {
        set({ error: String(e) });
      }
    },
  };
});
