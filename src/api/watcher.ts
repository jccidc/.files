import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface FsEvent {
  kind: string;
  paths: string[];
}

export async function watchDir(id: string, path: string): Promise<void> {
  return invoke('watch_dir', { id, path });
}

export async function unwatchDir(id: string): Promise<void> {
  return invoke('unwatch_dir', { id });
}

export function onFsChange(id: string, callback: (event: FsEvent) => void) {
  return listen<FsEvent>(`fs-change-${id}`, (e) => callback(e.payload));
}
