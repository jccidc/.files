import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentsStore {
  recentFiles: string[];
  recentFolders: string[];
  addRecentFile: (path: string) => void;
  addRecentFolder: (path: string) => void;
  clearRecents: () => void;
}

const MAX_RECENTS = 20;

export const useRecentsStore = create<RecentsStore>()(
  persist(
    (set) => ({
      recentFiles: [],
      recentFolders: [],

      addRecentFile: (path) => set((s) => ({
        recentFiles: [path, ...s.recentFiles.filter((p) => p !== path)].slice(0, MAX_RECENTS),
      })),

      addRecentFolder: (path) => set((s) => ({
        recentFolders: [path, ...s.recentFolders.filter((p) => p !== path)].slice(0, MAX_RECENTS),
      })),

      clearRecents: () => set({ recentFiles: [], recentFolders: [] }),
    }),
    { name: 'dotfiles-recents' }
  )
);
