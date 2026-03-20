import { invoke } from '@tauri-apps/api/core';

export async function extractArchive(path: string, dest?: string): Promise<string> {
  return invoke<string>('extract_archive', { path, dest: dest ?? null });
}

export async function compressArchive(paths: string[], dest: string, format: string): Promise<string> {
  return invoke<string>('compress_archive', { paths, dest, format });
}

export async function listArchive(path: string): Promise<string[]> {
  return invoke<string[]>('list_archive', { path });
}
