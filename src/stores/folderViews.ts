import { useSettingsStore } from './settings';
import type { FolderViewPref } from '../types';

// Explorer-style per-folder view memory. Overrides live in settings.folder_views,
// keyed by normalized path; the global defaults are settings.sort_by / sort_asc /
// default_view. Resolution order: exact folder entry -> nearest ancestor entry
// marked `recursive` ("Apply to Subfolders" in the Toolbar sort menu) -> globals.

const MAX_FOLDER_VIEWS = 300;

/** Case-insensitive, separator/trailing-slash-insensitive key (Windows paths) */
export function folderKey(path: string): string {
  return path.replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
}

/** Exact entry for this folder only (no ancestor lookup) */
export function getFolderView(path: string): FolderViewPref | undefined {
  if (!path) return undefined;
  return (useSettingsStore.getState().settings.folder_views || {})[folderKey(path)];
}

/** Effective pref for a folder: exact entry, else nearest recursive ancestor */
export function resolveFolderView(path: string): FolderViewPref | undefined {
  if (!path) return undefined;
  const views = useSettingsStore.getState().settings.folder_views || {};
  const key = folderKey(path);
  if (views[key]) return views[key];
  let k = key;
  while (k.includes('\\')) {
    k = k.slice(0, k.lastIndexOf('\\'));
    const v = views[k];
    if (v?.recursive) return v;
  }
  return undefined;
}

export function saveFolderView(path: string, patch: FolderViewPref): void {
  if (!path || path === 'this-pc' || path === 'recycle-bin') return;
  const key = folderKey(path);
  const store = useSettingsStore.getState();
  const views = { ...(store.settings.folder_views || {}) };
  const merged = { ...views[key], ...patch };
  // Re-insert at the end so object insertion order doubles as LRU order
  delete views[key];
  views[key] = merged;
  const keys = Object.keys(views);
  // Subtree prefs are deliberate ("Apply to Subfolders") — never LRU-evict them
  const evictable = keys.filter((k) => !views[k].recursive);
  for (const k of evictable.slice(0, Math.max(0, keys.length - MAX_FOLDER_VIEWS))) delete views[k];
  store.update({ folder_views: views });
}

/** "Apply to Subfolders": this folder's sort+view becomes the default for its
 * entire subtree. Existing per-folder overrides beneath it are cleared. */
export function applyToSubtree(path: string, pref: FolderViewPref): void {
  if (!path || path === 'this-pc' || path === 'recycle-bin') return;
  const key = folderKey(path);
  const store = useSettingsStore.getState();
  const views = { ...(store.settings.folder_views || {}) };
  for (const k of Object.keys(views)) {
    if (k.startsWith(key + '\\')) delete views[k];
  }
  delete views[key];
  views[key] = { ...pref, recursive: true };
  store.update({ folder_views: views });
}
