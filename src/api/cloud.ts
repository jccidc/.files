import { invoke } from '@tauri-apps/api/core';

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  clone_url: string;
  ssh_url: string;
  html_url: string;
  is_private: boolean;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
}

export interface CloudMount {
  provider: string;
  label: string;
  path: string;
}

export function githubListRepos(pat: string, page: number = 1): Promise<GitHubRepo[]> {
  return invoke('github_list_repos', { pat, page });
}

export function detectCloudMounts(): Promise<CloudMount[]> {
  return invoke('detect_cloud_mounts');
}

export function findLocalRepo(name: string): Promise<string | null> {
  return invoke('find_local_repo', { name });
}
