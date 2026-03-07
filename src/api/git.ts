import { invoke } from '@tauri-apps/api/core';

export interface GitRepoInfo {
  is_repo: boolean;
  root: string | null;
  branch: string | null;
  ahead: number;
  behind: number;
  has_remote: boolean;
}

export interface GitFileStatus {
  path: string;
  status: string;
  staged: boolean;
}

export interface GitStatusResult {
  files: GitFileStatus[];
  branch: string | null;
  ahead: number;
  behind: number;
  has_remote: boolean;
}

export interface GitLogEntry {
  id: string;
  short_id: string;
  message: string;
  author: string;
  email: string;
  time: number;
  time_offset: number;
}

export interface GitDiffLine {
  origin: string;
  content: string;
  old_lineno: number | null;
  new_lineno: number | null;
}

export interface GitDiffHunk {
  header: string;
  lines: GitDiffLine[];
}

export interface GitDiffFile {
  path: string;
  old_path: string | null;
  status: string;
  hunks: GitDiffHunk[];
  additions: number;
  deletions: number;
}

export interface GitDiffResult {
  files: GitDiffFile[];
}

export interface GitBranch {
  name: string;
  is_head: boolean;
  is_remote: boolean;
  upstream: string | null;
}

export function gitRepoInfo(path: string): Promise<GitRepoInfo> {
  return invoke('git_repo_info', { path });
}

export function gitStatus(path: string): Promise<GitStatusResult> {
  return invoke('git_status', { path });
}

export function gitStage(path: string, files: string[]): Promise<void> {
  return invoke('git_stage', { path, files });
}

export function gitUnstage(path: string, files: string[]): Promise<void> {
  return invoke('git_unstage', { path, files });
}

export function gitCommit(path: string, message: string): Promise<string> {
  return invoke('git_commit', { path, message });
}

export function gitLog(path: string, maxCount: number = 50): Promise<GitLogEntry[]> {
  return invoke('git_log', { path, maxCount });
}

export function gitDiff(path: string, staged: boolean): Promise<GitDiffResult> {
  return invoke('git_diff', { path, staged });
}

export function gitBranches(path: string): Promise<GitBranch[]> {
  return invoke('git_branches', { path });
}

export function gitDiscard(path: string, files: string[]): Promise<void> {
  return invoke('git_discard', { path, files });
}
