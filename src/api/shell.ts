import { invoke } from '@tauri-apps/api/core';

export async function deleteToTrash(paths: string[]): Promise<void> {
  return invoke('delete_to_trash', { paths });
}

export async function openInExplorer(path: string): Promise<void> {
  return invoke('open_in_explorer', { path });
}

export async function openFile(path: string): Promise<void> {
  return invoke('open_file', { path });
}

export async function copyFiles(sources: string[], dest: string): Promise<void> {
  return invoke('copy_files', { sources, dest });
}

export async function moveFiles(sources: string[], dest: string): Promise<void> {
  return invoke('move_files', { sources, dest });
}

export async function renameFile(path: string, newName: string): Promise<string> {
  return invoke('rename_file', { path, newName });
}

/** Friendly Explorer-style type names per extension (e.g. pdf -> "Adobe Acrobat Document") */
export async function fileTypeNames(extensions: string[]): Promise<Record<string, string>> {
  return invoke('file_type_names', { extensions });
}

export async function resolveShortcut(path: string): Promise<string | null> {
  return invoke('resolve_shortcut', { path });
}

export async function showProperties(path: string): Promise<void> {
  return invoke('show_properties', { path });
}
