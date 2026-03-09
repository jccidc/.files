import { invoke } from '@tauri-apps/api/core';

export async function listSystemFonts(): Promise<string[]> {
  return invoke('list_system_fonts');
}

export async function installCustomFont(sourcePath: string): Promise<{ name: string; file: string }> {
  return invoke('install_custom_font', { sourcePath });
}

export async function removeCustomFont(filename: string): Promise<void> {
  return invoke('remove_custom_font', { filename });
}
