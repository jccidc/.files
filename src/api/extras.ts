import { invoke } from '@tauri-apps/api/core';

export async function listRecycleBin(): Promise<[string, string, string][]> {
  return invoke('list_recycle_bin');
}

export async function emptyRecycleBin(): Promise<void> {
  return invoke('empty_recycle_bin');
}

export async function restoreFromBin(itemName: string): Promise<void> {
  return invoke('restore_from_bin', { itemName });
}

export async function createSymlink(target: string, linkPath: string): Promise<void> {
  return invoke('create_symlink', { target, linkPath });
}

export async function permanentDelete(paths: string[]): Promise<void> {
  return invoke('permanent_delete', { paths });
}

export async function searchFileContents(
  dir: string,
  query: string,
  maxResults?: number,
): Promise<[string, number, string][]> {
  return invoke('search_file_contents', { dir, query, maxResults: maxResults ?? null });
}

export async function toggleFullscreen(): Promise<void> {
  return invoke('toggle_fullscreen');
}
