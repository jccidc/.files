import { invoke } from '@tauri-apps/api/core';

export async function isDefaultFolderHandler(): Promise<boolean> {
  return invoke<boolean>('is_default_folder_handler');
}

export async function setDefaultFolderHandler(enable: boolean): Promise<void> {
  return invoke('set_default_folder_handler', { enable });
}
