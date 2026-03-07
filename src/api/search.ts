import { invoke } from '@tauri-apps/api/core';

export interface SearchResult {
  name: string;
  path: string;
  is_dir: boolean;
  score: number;
}

export async function fuzzyFind(root: string, query: string, maxResults: number = 50): Promise<SearchResult[]> {
  return invoke('fuzzy_find', { root, query, maxResults });
}
