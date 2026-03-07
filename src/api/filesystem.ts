import { invoke } from '@tauri-apps/api/core';
import type { DirListing, DirStats, DriveInfo, FileEntry } from '../types';

export async function readDir(path: string, showHidden: boolean): Promise<DirListing> {
  return invoke('read_dir', { path, showHidden });
}

export async function statFile(path: string): Promise<FileEntry> {
  return invoke('stat_file', { path });
}

export async function getDrives(): Promise<DriveInfo[]> {
  return invoke('get_drives');
}

export async function readTextFile(path: string, maxBytes: number = 524288): Promise<string> {
  return invoke('read_text_file', { path, maxBytes });
}

export async function dirStats(path: string): Promise<DirStats> {
  return invoke('dir_stats', { path });
}

export async function getKnownFolderPaths(): Promise<[string, string][]> {
  return invoke('get_known_folder_paths');
}
