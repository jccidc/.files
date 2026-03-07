import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LayoutNode, LeafNode, SplitNode, SplitDirection, LayoutPreset } from '../types';

const DEFAULT_PANEL_ID = 'panel-main';

function makeLeaf(panelId: string): LeafNode {
  return { type: 'leaf', id: crypto.randomUUID(), panelId };
}

function makeSplit(dir: SplitDirection, first: LayoutNode, second: LayoutNode, ratio = 0.5): SplitNode {
  return { type: 'split', id: crypto.randomUUID(), direction: dir, ratio, first, second };
}

// Find a node by panelId
function findLeaf(node: LayoutNode, panelId: string): LeafNode | null {
  if (node.type === 'leaf') return node.panelId === panelId ? node : null;
  return findLeaf(node.first, panelId) || findLeaf(node.second, panelId);
}

// Replace a node by its id
function replaceNode(tree: LayoutNode, nodeId: string, replacement: LayoutNode): LayoutNode {
  if (tree.id === nodeId) return replacement;
  if (tree.type === 'leaf') return tree;
  return {
    ...tree,
    first: replaceNode(tree.first, nodeId, replacement),
    second: replaceNode(tree.second, nodeId, replacement),
  };
}

// Remove a leaf and collapse its parent split
function removeLeaf(tree: LayoutNode, panelId: string): LayoutNode | null {
  if (tree.type === 'leaf') {
    return tree.panelId === panelId ? null : tree;
  }
  // Check if first or second is the target leaf
  if (tree.first.type === 'leaf' && tree.first.panelId === panelId) {
    return tree.second;
  }
  if (tree.second.type === 'leaf' && tree.second.panelId === panelId) {
    return tree.first;
  }
  // Recurse
  const newFirst = removeLeaf(tree.first, panelId);
  if (newFirst !== tree.first) {
    return newFirst ? { ...tree, first: newFirst } : tree.second;
  }
  const newSecond = removeLeaf(tree.second, panelId);
  if (newSecond !== tree.second) {
    return newSecond ? { ...tree, second: newSecond } : tree.first;
  }
  return tree;
}

// Collect all panelIds
function collectPanelIds(node: LayoutNode): string[] {
  if (node.type === 'leaf') return [node.panelId];
  return [...collectPanelIds(node.first), ...collectPanelIds(node.second)];
}

// Update ratio on a split node by its id
function updateRatio(tree: LayoutNode, splitId: string, ratio: number): LayoutNode {
  if (tree.type === 'leaf') return tree;
  if (tree.id === splitId) return { ...tree, ratio: Math.max(0.15, Math.min(0.85, ratio)) };
  return {
    ...tree,
    first: updateRatio(tree.first, splitId, ratio),
    second: updateRatio(tree.second, splitId, ratio),
  };
}

interface LayoutState {
  tree: LayoutNode;
  sidebarVisible: boolean;
  sidebarWidth: number;
  previewVisible: boolean;
  presets: LayoutPreset[];

  // Sidebar
  toggleSidebar: () => void;
  togglePreview: () => void;
  setSidebarWidth: (w: number) => void;

  // Split operations
  splitPanel: (panelId: string, direction: SplitDirection, newPanelId: string) => void;
  closePanel: (panelId: string) => void;
  setRatio: (splitId: string, ratio: number) => void;
  resetRatio: (splitId: string) => void;

  // Preset operations
  savePreset: (name: string, panels: Record<string, unknown>) => void;
  loadPreset: (index: number) => LayoutPreset | null;
  deletePreset: (index: number) => void;

  // Helpers
  getPanelIds: () => string[];
  getTree: () => LayoutNode;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      tree: makeLeaf(DEFAULT_PANEL_ID),
      sidebarVisible: true,
      sidebarWidth: 220,
      previewVisible: false,
      presets: [],

      toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
      togglePreview: () => set((s) => ({ previewVisible: !s.previewVisible })),
      setSidebarWidth: (w) => set({ sidebarWidth: Math.max(140, Math.min(400, w)) }),

      splitPanel: (panelId, direction, newPanelId) =>
        set((s) => {
          const leaf = findLeaf(s.tree, panelId);
          if (!leaf) return s;

          const newLeaf = makeLeaf(newPanelId);
          const split = makeSplit(direction, leaf, newLeaf);
          const newTree = replaceNode(s.tree, leaf.id, split);

          return { tree: newTree };
        }),

      closePanel: (panelId) =>
        set((s) => {
          const ids = collectPanelIds(s.tree);
          if (ids.length <= 1) return s; // Don't close the last panel
          const newTree = removeLeaf(s.tree, panelId);
          return { tree: newTree || s.tree };
        }),

      setRatio: (splitId, ratio) =>
        set((s) => ({ tree: updateRatio(s.tree, splitId, ratio) })),

      resetRatio: (splitId) =>
        set((s) => ({ tree: updateRatio(s.tree, splitId, 0.5) })),

      savePreset: (name, panels) =>
        set((s) => ({
          presets: [...s.presets, {
            name,
            tree: JSON.parse(JSON.stringify(s.tree)),
            panels: panels as Record<string, { tabs: { id: string; type: 'explorer' | 'terminal'; title: string; path?: string; pinned: boolean }[]; activeTabId: string | null }>,
          }],
        })),

      loadPreset: (index) => {
        const preset = get().presets[index];
        if (!preset) return null;
        set({ tree: JSON.parse(JSON.stringify(preset.tree)) });
        return preset;
      },

      deletePreset: (index) =>
        set((s) => ({
          presets: s.presets.filter((_, i) => i !== index),
        })),

      getPanelIds: () => collectPanelIds(get().tree),
      getTree: () => get().tree,
    }),
    {
      name: 'dotfiles-layout',
      partialize: (state) => ({
        tree: state.tree,
        sidebarVisible: state.sidebarVisible,
        sidebarWidth: state.sidebarWidth,
        presets: state.presets,
      }),
    },
  ),
);

export { DEFAULT_PANEL_ID };
