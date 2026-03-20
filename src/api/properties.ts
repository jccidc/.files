import { invoke } from '@tauri-apps/api/core';

export interface DriveInfo {
  letter: string;
  label: string;
  total_bytes: number;
  free_bytes: number;
  used_bytes: number;
  file_system: string;
  drive_type: string;
}

export interface FileProperties {
  path: string;
  name: string;
  is_dir: boolean;
  size: number;
  file_count: number | null;
  dir_count: number | null;
  created: string;
  modified: string;
  accessed: string;
  readonly: boolean;
  hidden: boolean;
  system: boolean;
  extension: string | null;
}

export async function getAllDriveProperties(): Promise<DriveInfo[]> {
  return invoke('get_all_drive_properties');
}

export async function getFileProperties(path: string): Promise<FileProperties> {
  return invoke('get_file_properties', { path });
}

export async function setFileAttribute(path: string, attribute: string, value: boolean): Promise<void> {
  return invoke('set_file_attribute', { path, attribute, value });
}
