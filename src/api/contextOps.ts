import { invoke } from '@tauri-apps/api/core';

export async function getOpenWithApps(path: string): Promise<[string, string][]> {
  return invoke('get_open_with_apps', { path });
}

export async function openWith(path: string, app: string): Promise<void> {
  return invoke('open_with', { path, app });
}

export async function openWithDialog(path: string): Promise<void> {
  return invoke('open_with_dialog', { path });
}

export async function getSendToItems(): Promise<[string, string][]> {
  return invoke('get_send_to_items');
}

export async function sendTo(filePath: string, targetPath: string): Promise<void> {
  return invoke('send_to', { filePath, targetPath });
}

export async function compressToZip(sources: string[], destZip: string): Promise<string> {
  return invoke('compress_to_zip', { sources, destZip });
}

export async function extractZip(zipPath: string, destDir: string): Promise<string> {
  return invoke('extract_zip', { zipPath, destDir });
}

export async function createShortcut(targetPath: string, shortcutPath: string): Promise<void> {
  return invoke('create_shortcut', { targetPath, shortcutPath });
}

export async function listSubdirs(path: string): Promise<string[]> {
  return invoke('list_subdirs', { path });
}
