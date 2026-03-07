import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tab, PanelState } from '../types';

interface PanelsState {
  panels: Record<string, PanelState>;
  focusedPanelId: string | null;

  // Panel operations
  createPanel: (panelId: string, tabs?: Tab[]) => void;
  removePanel: (panelId: string) => void;
  focusPanel: (panelId: string) => void;

  // Tab operations (panel-scoped)
  addTab: (panelId: string, tab: Tab) => void;
  closeTab: (panelId: string, tabId: string) => void;
  setActiveTab: (panelId: string, tabId: string) => void;
  updateTab: (panelId: string, tabId: string, updates: Partial<Tab>) => void;
  pinTab: (panelId: string, tabId: string) => void;
  moveTabToPanel: (fromPanelId: string, tabId: string, toPanelId: string) => void;

  // Helpers
  getPanel: (panelId: string) => PanelState | undefined;
  getFocusedPanel: () => PanelState | undefined;
  getFocusedActiveTab: () => Tab | undefined;
}

const EMPTY_PANEL: PanelState = { tabs: [], activeTabId: null };

export const usePanelsStore = create<PanelsState>()(
  persist(
    (set, get) => ({
      panels: {},
      focusedPanelId: null,

      createPanel: (panelId, tabs) => {
        const panel: PanelState = tabs?.length
          ? { tabs, activeTabId: tabs[0].id }
          : { ...EMPTY_PANEL };
        set((s) => ({
          panels: { ...s.panels, [panelId]: panel },
          focusedPanelId: s.focusedPanelId || panelId,
        }));
      },

      removePanel: (panelId) =>
        set((s) => {
          const { [panelId]: _, ...rest } = s.panels;
          const nextFocus = s.focusedPanelId === panelId
            ? Object.keys(rest)[0] || null
            : s.focusedPanelId;
          return { panels: rest, focusedPanelId: nextFocus };
        }),

      focusPanel: (panelId) => set({ focusedPanelId: panelId }),

      addTab: (panelId, tab) =>
        set((s) => {
          const panel = s.panels[panelId] || { ...EMPTY_PANEL };
          return {
            panels: {
              ...s.panels,
              [panelId]: {
                tabs: [...panel.tabs, tab],
                activeTabId: tab.id,
              },
            },
            focusedPanelId: panelId,
          };
        }),

      closeTab: (panelId, tabId) =>
        set((s) => {
          const panel = s.panels[panelId];
          if (!panel) return s;
          const idx = panel.tabs.findIndex((t) => t.id === tabId);
          if (idx === -1) return s;

          const next = panel.tabs.filter((t) => t.id !== tabId);
          let nextActive = panel.activeTabId;

          if (panel.activeTabId === tabId) {
            if (next.length === 0) {
              nextActive = null;
            } else if (idx < next.length) {
              nextActive = next[idx].id;
            } else {
              nextActive = next[next.length - 1].id;
            }
          }

          return {
            panels: {
              ...s.panels,
              [panelId]: { tabs: next, activeTabId: nextActive },
            },
          };
        }),

      setActiveTab: (panelId, tabId) =>
        set((s) => {
          const panel = s.panels[panelId];
          if (!panel) return s;
          return {
            panels: {
              ...s.panels,
              [panelId]: { ...panel, activeTabId: tabId },
            },
            focusedPanelId: panelId,
          };
        }),

      updateTab: (panelId, tabId, updates) =>
        set((s) => {
          const panel = s.panels[panelId];
          if (!panel) return s;
          return {
            panels: {
              ...s.panels,
              [panelId]: {
                ...panel,
                tabs: panel.tabs.map((t) =>
                  t.id === tabId ? { ...t, ...updates } : t,
                ),
              },
            },
          };
        }),

      pinTab: (panelId, tabId) =>
        set((s) => {
          const panel = s.panels[panelId];
          if (!panel) return s;
          const tab = panel.tabs.find((t) => t.id === tabId);
          if (!tab) return s;

          const toggled = { ...tab, pinned: !tab.pinned };
          const others = panel.tabs.filter((t) => t.id !== tabId);

          let next: Tab[];
          if (toggled.pinned) {
            const lastPinnedIdx = others.reduce((acc, t, i) => (t.pinned ? i : acc), -1);
            next = [...others.slice(0, lastPinnedIdx + 1), toggled, ...others.slice(lastPinnedIdx + 1)];
          } else {
            const firstUnpinnedIdx = others.findIndex((t) => !t.pinned);
            const insertAt = firstUnpinnedIdx === -1 ? others.length : firstUnpinnedIdx;
            next = [...others.slice(0, insertAt), toggled, ...others.slice(insertAt)];
          }

          return {
            panels: {
              ...s.panels,
              [panelId]: { ...panel, tabs: next },
            },
          };
        }),

      moveTabToPanel: (fromPanelId, tabId, toPanelId) => {
        const state = get();
        const from = state.panels[fromPanelId];
        const to = state.panels[toPanelId];
        if (!from || !to) return;

        const tab = from.tabs.find((t) => t.id === tabId);
        if (!tab) return;

        // Remove from source
        state.closeTab(fromPanelId, tabId);
        // Add to target
        state.addTab(toPanelId, tab);
      },

      getPanel: (panelId) => get().panels[panelId],
      getFocusedPanel: () => {
        const s = get();
        return s.focusedPanelId ? s.panels[s.focusedPanelId] : undefined;
      },
      getFocusedActiveTab: () => {
        const s = get();
        if (!s.focusedPanelId) return undefined;
        const panel = s.panels[s.focusedPanelId];
        if (!panel) return undefined;
        return panel.tabs.find((t) => t.id === panel.activeTabId);
      },
    }),
    {
      name: 'dotfiles-panels',
      partialize: (state) => ({
        panels: state.panels,
        focusedPanelId: state.focusedPanelId,
      }),
    },
  ),
);
