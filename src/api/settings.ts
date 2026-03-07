import { invoke } from '@tauri-apps/api/core';
import type { AppSettings } from '../types';

export async function loadSettings(): Promise<AppSettings> {
  return invoke('load_settings');
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  return invoke('save_settings', { settings });
}
