import { create } from 'zustand';
import {
  gitRepoInfo,
  gitStatus,
  gitStage,
  gitUnstage,
  gitCommit,
  gitLog,
  gitDiff,
  gitBranches,
  gitDiscard,
} from '../api/git';
import type {
  GitRepoInfo,
  GitFileStatus,
  GitLogEntry,
  GitDiffResult,
  GitBranch,
} from '../api/git';

interface GitState {
  // Repo state
  repoInfo: GitRepoInfo | null;
  files: GitFileStatus[];
  branches: GitBranch[];
  log: GitLogEntry[];
  diff: GitDiffResult | null;
  diffStaged: boolean;
  loading: boolean;
  error: string | null;
  commitMessage: string;

  // Actions
  checkRepo: (path: string) => Promise<void>;
  refreshStatus: (path: string) => Promise<void>;
  refreshBranches: (path: string) => Promise<void>;
  refreshLog: (path: string) => Promise<void>;
  loadDiff: (path: string, staged: boolean) => Promise<void>;
  stage: (path: string, files: string[]) => Promise<void>;
  unstage: (path: string, files: string[]) => Promise<void>;
  commit: (path: string) => Promise<string | null>;
  discard: (path: string, files: string[]) => Promise<void>;
  setCommitMessage: (msg: string) => void;
}

export const useGitStore = create<GitState>((set, get) => ({
  repoInfo: null,
  files: [],
  branches: [],
  log: [],
  diff: null,
  diffStaged: false,
  loading: false,
  error: null,
  commitMessage: '',

  checkRepo: async (path) => {
    try {
      const info = await gitRepoInfo(path);
      set({ repoInfo: info, error: null });
      if (info.is_repo && info.root) {
        // Auto-refresh status when we detect a repo
        get().refreshStatus(info.root);
      }
    } catch {
      set({ repoInfo: null });
    }
  },

  refreshStatus: async (path) => {
    set({ loading: true });
    try {
      const result = await gitStatus(path);
      set({
        files: result.files,
        repoInfo: {
          is_repo: true,
          root: path,
          branch: result.branch,
          ahead: result.ahead,
          behind: result.behind,
          has_remote: result.has_remote,
        },
        loading: false,
        error: null,
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  refreshBranches: async (path) => {
    try {
      const branches = await gitBranches(path);
      set({ branches });
    } catch {}
  },

  refreshLog: async (path) => {
    try {
      const log = await gitLog(path, 50);
      set({ log });
    } catch {}
  },

  loadDiff: async (path, staged) => {
    try {
      const diff = await gitDiff(path, staged);
      set({ diff, diffStaged: staged });
    } catch {
      set({ diff: null });
    }
  },

  stage: async (path, files) => {
    try {
      await gitStage(path, files);
      get().refreshStatus(path);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  unstage: async (path, files) => {
    try {
      await gitUnstage(path, files);
      get().refreshStatus(path);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  commit: async (path) => {
    const msg = get().commitMessage.trim();
    if (!msg) {
      set({ error: 'Commit message is required' });
      return null;
    }
    try {
      const oid = await gitCommit(path, msg);
      set({ commitMessage: '', error: null });
      get().refreshStatus(path);
      get().refreshLog(path);
      return oid;
    } catch (e) {
      set({ error: String(e) });
      return null;
    }
  },

  discard: async (path, files) => {
    try {
      await gitDiscard(path, files);
      get().refreshStatus(path);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  setCommitMessage: (msg) => set({ commitMessage: msg }),
}));
