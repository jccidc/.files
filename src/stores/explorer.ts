import { create } from 'zustand';
import type { FileEntry } from '../types';
import { readDir } from '../api/filesystem';
import { useSettingsStore } from './settings';

export type ViewMode = 'list' | 'grid';

interface ExplorerState {
  currentPath: string;
  entries: FileEntry[];
  selectedPaths: Set<string>;
  loading: boolean;
  error: string | null;
  viewMode: ViewMode;
  navigate: (path: string) => Promise<void>;
  refresh: () => Promise<void>;
  setSelected: (paths: Set<string>) => void;
  toggleSelected: (path: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setViewMode: (mode: ViewMode) => void;
}

export const useExplorerStore = create<ExplorerState>((set, get) => ({
  currentPath: 'C:\\',
  entries: [],
  selectedPaths: new Set(),
  loading: false,
  error: null,
  viewMode: 'list',

  navigate: async (path: string) => {
    set({ loading: true, error: null });
    try {
      const showHidden = useSettingsStore.getState().settings.show_hidden;
      const listing = await readDir(path, showHidden);
      set({
        currentPath: listing.path,
        entries: listing.entries,
        selectedPaths: new Set(),
        loading: false,
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
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
}));
