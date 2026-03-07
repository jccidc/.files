import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileEntry } from '../types';

interface PreviewState {
  previewEntry: FileEntry | null;
  pinned: boolean;
  panelVisible: boolean;
  panelWidth: number;
  overlayEntry: FileEntry | null;

  setPreviewEntry: (entry: FileEntry | null) => void;
  setPinned: (pinned: boolean) => void;
  togglePinned: () => void;
  togglePanel: () => void;
  showPanel: () => void;
  hidePanel: () => void;
  setPanelWidth: (width: number) => void;
  setOverlayEntry: (entry: FileEntry | null) => void;
  followSelection: (entry: FileEntry | null) => void;
}

export const usePreviewStore = create<PreviewState>()(
  persist(
    (set, get) => ({
      previewEntry: null,
      pinned: false,
      panelVisible: false,
      panelWidth: 350,
      overlayEntry: null,

      setPreviewEntry: (entry) => set({ previewEntry: entry }),
      setPinned: (pinned) => set({ pinned }),
      togglePinned: () => set((s) => ({ pinned: !s.pinned })),
      togglePanel: () => set((s) => ({ panelVisible: !s.panelVisible })),
      showPanel: () => set({ panelVisible: true }),
      hidePanel: () => set({ panelVisible: false }),
      setPanelWidth: (width) => set({ panelWidth: Math.max(250, width) }),
      setOverlayEntry: (entry) => set({ overlayEntry: entry }),

      followSelection: (entry) => {
        const { pinned, panelVisible } = get();
        if (!pinned && panelVisible && entry) {
          set({ previewEntry: entry });
        }
      },
    }),
    {
      name: 'dotfiles-preview',
      partialize: (state) => ({
        panelVisible: state.panelVisible,
        panelWidth: state.panelWidth,
        pinned: state.pinned,
      }),
    },
  ),
);
