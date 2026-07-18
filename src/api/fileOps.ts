import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface FileConflict {
  source: string;
  target: string;
  source_size: number;
  target_size: number;
  source_modified: string;
  target_modified: string;
}

export interface FileOpProgress {
  op_id: string;
  current_file: string;
  files_done: number;
  files_total: number;
  bytes_done: number;
  bytes_total: number;
}

export interface FileOpResult {
  op_id: string;
  op_type: string;
  sources: string[];
  dest: string;
  created_paths: string[];
  skipped: string[];
}

export async function checkConflicts(sources: string[], dest: string): Promise<FileConflict[]> {
  return invoke('check_conflicts', { sources, dest });
}

export async function copyFilesWithProgress(
  opId: string,
  sources: string[],
  dest: string,
  conflictResolution: string,
): Promise<FileOpResult> {
  return invoke('copy_files_with_progress', { opId, sources, dest, conflictResolution });
}

export async function moveFilesWithProgress(
  opId: string,
  sources: string[],
  dest: string,
  conflictResolution: string,
): Promise<FileOpResult> {
  return invoke('move_files_with_progress', { opId, sources, dest, conflictResolution });
}

export async function cancelFileOp(opId: string): Promise<void> {
  return invoke('cancel_file_op', { opId });
}

export async function onFileOpProgress(
  callback: (progress: FileOpProgress) => void,
): Promise<() => void> {
  return listen<FileOpProgress>('file-op-progress', (event) => {
    callback(event.payload);
  });
}

/** Terminal event — fires on success, error, AND cancel, unlike progress events */
export interface FileOpDone {
  op_id: string;
  error: string | null;
  cancelled: boolean;
}

export async function onFileOpDone(
  callback: (done: FileOpDone) => void,
): Promise<() => void> {
  return listen<FileOpDone>('file-op-done', (event) => {
    callback(event.payload);
  });
}
