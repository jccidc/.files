import { invoke } from '@tauri-apps/api/core';

/** Copy file paths to the Windows system clipboard (pasteable in Explorer) */
export async function clipboardCopyFiles(paths: string[]): Promise<void> {
  return invoke('clipboard_copy_files', { paths });
}

/** Cut file paths to the Windows system clipboard */
export async function clipboardCutFiles(paths: string[]): Promise<void> {
  return invoke('clipboard_cut_files', { paths });
}

/** Read file paths from the Windows system clipboard. Returns [paths, isCut]. */
export async function clipboardReadFiles(): Promise<[string[], boolean]> {
  return invoke('clipboard_read_files');
}

/** Check if the system clipboard has files */
export async function clipboardHasFiles(): Promise<boolean> {
  return invoke('clipboard_has_files');
}
