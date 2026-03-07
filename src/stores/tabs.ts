import { create } from 'zustand';
import type { Tab } from '../types';

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (tab: Tab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  pinTab: (id: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

export const useTabsStore = create<TabsState>((set) => ({
  tabs: [],
  activeTabId: null,

  addTab: (tab) =>
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    })),

  closeTab: (id) =>
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === id);
      if (idx === -1) return state;

      const next = state.tabs.filter((t) => t.id !== id);
      let nextActive = state.activeTabId;

      if (state.activeTabId === id) {
        if (next.length === 0) {
          nextActive = null;
        } else if (idx < next.length) {
          nextActive = next[idx].id;
        } else {
          nextActive = next[next.length - 1].id;
        }
      }

      return { tabs: next, activeTabId: nextActive };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTab: (id, updates) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  pinTab: (id) =>
    set((state) => {
      const tab = state.tabs.find((t) => t.id === id);
      if (!tab) return state;

      const toggled = { ...tab, pinned: !tab.pinned };
      const others = state.tabs.filter((t) => t.id !== id);

      if (toggled.pinned) {
        // Move to end of pinned section
        const lastPinnedIdx = others.reduce(
          (acc, t, i) => (t.pinned ? i : acc),
          -1
        );
        const insertAt = lastPinnedIdx + 1;
        const next = [...others.slice(0, insertAt), toggled, ...others.slice(insertAt)];
        return { tabs: next };
      } else {
        // Move to start of unpinned section
        const firstUnpinnedIdx = others.findIndex((t) => !t.pinned);
        const insertAt = firstUnpinnedIdx === -1 ? others.length : firstUnpinnedIdx;
        const next = [...others.slice(0, insertAt), toggled, ...others.slice(insertAt)];
        return { tabs: next };
      }
    }),

  reorderTabs: (fromIndex, toIndex) =>
    set((state) => {
      const next = [...state.tabs];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { tabs: next };
    }),
}));
