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
      setPanelWidth: (width) => set({
        panelWidth: Math.max(250, typeof window !== 'undefined' ? Math.min(width, window.innerWidth * 0.5) : width),
      }),
      setOverlayEntry: (entry) => set({ overlayEntry: entry }),

      followSelection: (entry) => {
        if (!entry) return;
        const { pinned, panelVisible } = get();
        if (pinned) return;
        // Only update preview content if panel is already open
        if (!entry.is_dir && panelVisible) {
          set({ previewEntry: entry });
        }
      },
    }),
    {
      name: 'dotfiles-preview',
      // pinned deliberately NOT persisted — a pin surviving restart silently
      // freezes followSelection and reads as "preview randomly stops updating"
      partialize: (state) => ({
        panelVisible: state.panelVisible,
        panelWidth: state.panelWidth,
      }),
    },
  ),
);
