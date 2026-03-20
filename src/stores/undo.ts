import { create } from 'zustand';

export interface UndoableOp {
  id: string;
  type: 'copy' | 'move' | 'delete' | 'create';
  description: string;
  // For copy: created_paths to delete
  // For move: reverse the move (created_paths -> sources)
  // For delete: paths that were deleted (can't truly undo recycle bin delete from here)
  // For create: path to delete
  createdPaths: string[];
  originalSources: string[];
  dest: string;
  timestamp: number;
}

interface UndoStore {
  history: UndoableOp[];
  push: (op: UndoableOp) => void;
  pop: () => UndoableOp | undefined;
  peek: () => UndoableOp | undefined;
  clear: () => void;
}

const MAX_UNDO_HISTORY = 50;

export const useUndoStore = create<UndoStore>((set, get) => ({
  history: [],

  push: (op) => set((s) => ({
    history: [...s.history.slice(-MAX_UNDO_HISTORY + 1), op],
  })),

  pop: () => {
    const { history } = get();
    if (history.length === 0) return undefined;
    const op = history[history.length - 1];
    set({ history: history.slice(0, -1) });
    return op;
  },

  peek: () => {
    const { history } = get();
    return history[history.length - 1];
  },

  clear: () => set({ history: [] }),
}));
