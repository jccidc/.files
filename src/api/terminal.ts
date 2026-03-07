import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export async function spawnPty(id: string, shell: string, rows: number, cols: number, cwd?: string): Promise<void> {
  return invoke('spawn_pty', { id, shell, rows, cols, cwd });
}

export async function writePty(id: string, data: string): Promise<void> {
  return invoke('write_pty', { id, data });
}

export async function resizePty(id: string, rows: number, cols: number): Promise<void> {
  return invoke('resize_pty', { id, rows, cols });
}

export async function killPty(id: string): Promise<void> {
  return invoke('kill_pty', { id });
}

export function onPtyOutput(id: string, callback: (data: string) => void) {
  return listen<string>(`pty-output-${id}`, (event) => callback(event.payload));
}
