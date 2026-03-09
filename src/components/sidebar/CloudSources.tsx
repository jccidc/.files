import { useEffect, useState, useRef } from 'react';
import { useSettingsStore } from '../../stores/settings';
import { useExplorerStore, useActiveExplorerState } from '../../stores/explorer';
import { githubListRepos, detectCloudMounts, findLocalRepo } from '../../api/cloud';
import { gitClone } from '../../api/git';
import { FolderTreeItem } from './Sidebar';
import type { GitHubRepo, CloudMount } from '../../api/cloud';

// ---- Icons ----

function IconCloud() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--cyan)" strokeWidth="1.3">
      <path d="M4.5 12.5A3.5 3.5 0 013 5.8 4.5 4.5 0 0111.8 4a3 3 0 01.7 5.9" />
      <path d="M5 12h6a2.5 2.5 0 000-5h-.5" />
    </svg>
  );
}

function IconGitHub() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--t2)">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function IconOneDrive() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.3">
      <path d="M3 11.5a2.5 2.5 0 01-.5-4.95 3.5 3.5 0 016.7-1.55A3 3 0 0113 8.5" />
      <path d="M4.5 11.5h8a2 2 0 000-4h-.5" />
    </svg>
  );
}

function IconGDrive() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" strokeWidth="1.3">
      <polygon points="2,13 5.5,7 9,13" stroke="var(--green)" />
      <polygon points="7,3 10.5,9 14,3" stroke="var(--yellow)" />
      <line x1="5.5" y1="10" x2="14" y2="10" stroke="var(--accent)" />
    </svg>
  );
}

function IconDropbox() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--accent)" stroke="none">
      <polygon points="8,1 3,4 8,7" opacity="0.7" />
      <polygon points="8,1 13,4 8,7" opacity="0.9" />
      <polygon points="3,4 8,7 3,10" opacity="0.5" />
      <polygon points="13,4 8,7 13,10" opacity="0.7" />
      <polygon points="8,8.5 3,11.5 8,14.5" opacity="0.3" />
      <polygon points="8,8.5 13,11.5 8,14.5" opacity="0.5" />
    </svg>
  );
}

function IconKey() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="3.5" cy="3.5" r="2" />
      <line x1="5" y1="5" x2="9" y2="9" />
      <line x1="7" y1="9" x2="9" y2="7" />
    </svg>
  );
}

function IconClone() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1" y="3" width="5" height="5" rx="0.5" />
      <polyline points="4,3 4,1.5 8.5,1.5 8.5,6 7,6" />
    </svg>
  );
}

const providerIcon: Record<string, React.ReactNode> = {
  onedrive: <IconOneDrive />,
  gdrive: <IconGDrive />,
  dropbox: <IconDropbox />,
};

// ---- PAT Setup Inline ----

function PatSetup({ onSave }: { onSave: (pat: string) => void }) {
  const [value, setValue] = useState('');

  return (
    <div style={{ padding: '4px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 4 }}>
        Enter a GitHub Personal Access Token to browse your repos.
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ghp_..."
          style={{
            flex: 1, background: 'var(--deep)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '4px 8px', color: 'var(--t1)', fontSize: 'var(--file-font-size-sm, 12px)',
            fontFamily: "'JetBrains Mono', monospace", outline: 'none',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onSave(value.trim()); }}
        />
        <button
          onClick={() => { if (value.trim()) onSave(value.trim()); }}
          disabled={!value.trim()}
          style={{
            background: value.trim() ? 'var(--accent)' : 'var(--raised)',
            color: value.trim() ? '#fff' : 'var(--t3)',
            border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 'var(--file-font-size-sm, 12px)',
            cursor: value.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ---- GitHub Repo List ----

function IconLink() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M4 6l2-2" />
      <path d="M3 7.5A1.5 1.5 0 011.5 6L3 4.5A1.5 1.5 0 014.5 3" />
      <path d="M7 2.5A1.5 1.5 0 018.5 4L7 5.5A1.5 1.5 0 015.5 7" />
    </svg>
  );
}

function GitHubRepoList({ repos, loading, error, onClone, onRepoClick, onLink, cloning, linkedRepos }: {
  repos: GitHubRepo[];
  loading: boolean;
  error: string | null;
  onClone: (repo: GitHubRepo) => void;
  onRepoClick: (repo: GitHubRepo) => void;
  onLink: (repo: GitHubRepo) => void;
  cloning: string | null;
  linkedRepos: Record<string, string>;
}) {
  if (loading) {
    return <div style={{ padding: '4px 12px', fontSize: 'var(--file-font-size-sm, 12px)', color: 'var(--t3)' }}>Loading repos...</div>;
  }
  if (error) {
    return <div style={{ padding: '4px 12px', fontSize: 'var(--file-font-size-sm, 12px)', color: 'var(--red)' }}>{error}</div>;
  }
  if (repos.length === 0) {
    return <div style={{ padding: '4px 12px', fontSize: 'var(--file-font-size-sm, 12px)', color: 'var(--t3)' }}>No repos found</div>;
  }

  return (
    <div style={{ maxHeight: 240, overflowY: 'auto' }}>
      {repos.map((r) => (
        <div
          key={r.full_name}
          onClick={() => onRepoClick(r)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', fontSize: 'var(--file-font-size-sm, 12px)', color: 'var(--t2)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--hover)';
            const arrow = e.currentTarget.querySelector('[data-arrow]') as HTMLElement;
            if (arrow) arrow.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            const arrow = e.currentTarget.querySelector('[data-arrow]') as HTMLElement;
            if (arrow) arrow.style.opacity = '0';
          }}
        >
          <IconGitHub />
          <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}
              </span>
              {r.is_private && (
                <span style={{ fontSize: 9, color: 'var(--yellow)', border: '1px solid var(--yellow)', borderRadius: 3, padding: '0 3px', flexShrink: 0 }}>
                  private
                </span>
              )}
            </div>
            {r.description && (
              <div style={{ fontSize: 10, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.description}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, fontSize: 9, color: 'var(--t3)', marginTop: 1 }}>
              {r.language && <span>{r.language}</span>}
              {r.stargazers_count > 0 && <span>* {r.stargazers_count}</span>}
            </div>
          </div>
          {linkedRepos[r.full_name] && (
            <span title={`Linked: ${linkedRepos[r.full_name]}`} style={{ color: 'var(--green)', flexShrink: 0, display: 'flex' }}>
              <IconLink />
            </span>
          )}
          <span
            data-arrow
            style={{
              fontSize: 10, color: 'var(--t3)', opacity: 0,
              transition: 'opacity 0.15s', flexShrink: 0, marginRight: 2,
            }}
          >
            &rsaquo;
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onLink(r); }}
            title="Link to local folder"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--t3)', padding: 4, borderRadius: 3,
              display: 'flex', alignItems: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; }}
          >
            <IconLink />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClone(r); }}
            disabled={cloning === r.full_name}
            title="Clone"
            style={{
              background: 'transparent', border: 'none', cursor: cloning === r.full_name ? 'wait' : 'pointer',
              color: cloning === r.full_name ? 'var(--accent)' : 'var(--t3)', padding: 4, borderRadius: 3,
              display: 'flex', alignItems: 'center',
            }}
            onMouseEnter={(e) => { if (cloning !== r.full_name) e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { if (cloning !== r.full_name) e.currentTarget.style.color = 'var(--t3)'; }}
          >
            <IconClone />
          </button>
        </div>
      ))}
    </div>
  );
}

// ---- Main CloudSources ----

export function CloudSources({ onContextMenu }: { onContextMenu?: (e: React.MouseEvent, path: string) => void }) {
  const { tabId: activeTabId } = useActiveExplorerState();
  const navigate = (path: string) => {
    const tid = activeTabId || useExplorerStore.getState().activeTabId;
    if (tid) useExplorerStore.getState().navigate(tid, path);
  };
  const githubPat = useSettingsStore((s) => s.settings.github_pat);
  const githubRepoPaths = useSettingsStore((s) => s.settings.github_repo_paths) || {};
  const customSources = useSettingsStore((s) => s.settings.cloud_sources) || [];
  const updateSettings = useSettingsStore((s) => s.update);

  const [cloudMounts, setCloudMounts] = useState<CloudMount[]>([]);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [showPatSetup, setShowPatSetup] = useState(false);
  const [cloning, setCloning] = useState<string | null>(null);
  const [cloneTarget, setCloneTarget] = useState<{ repo: GitHubRepo; path: string } | null>(null);
  const [githubCollapsed, setGithubCollapsed] = useState(false);
  const loadedRef = useRef(false);

  // Detect cloud mounts on first render
  useEffect(() => {
    detectCloudMounts()
      .then(setCloudMounts)
      .catch(() => {});
  }, []);

  // Load GitHub repos when PAT is available
  useEffect(() => {
    if (githubPat && !loadedRef.current) {
      loadedRef.current = true;
      loadRepos();
    }
  }, [githubPat]);

  const loadRepos = async () => {
    if (!githubPat) return;
    setReposLoading(true);
    setReposError(null);
    try {
      const r = await githubListRepos(githubPat, 1);
      setRepos(r);
    } catch (e) {
      setReposError(String(e));
    }
    setReposLoading(false);
  };

  const handleSavePat = async (pat: string) => {
    await updateSettings({ github_pat: pat });
    setShowPatSetup(false);
    loadedRef.current = false;
  };

  const handleClearPat = async () => {
    await updateSettings({ github_pat: '' });
    setRepos([]);
    loadedRef.current = false;
  };

  const handleRepoClick = async (repo: GitHubRepo) => {
    // 1. Check saved repo-path mapping first
    const repoMap = useSettingsStore.getState().settings.github_repo_paths || {};
    const savedPath = repoMap[repo.full_name];
    if (savedPath) {
      navigate(savedPath);
      return;
    }
    // 2. Auto-detect via Rust scan
    try {
      const localPath = await findLocalRepo(repo.name);
      if (localPath) {
        // Save the mapping for future use
        await updateSettings({ github_repo_paths: { ...repoMap, [repo.full_name]: localPath } });
        navigate(localPath);
        return;
      }
    } catch {}
    // 3. Fall back to clone dialog
    handleClone(repo);
  };

  const handleLink = async (repo: GitHubRepo) => {
    // Open a dialog to pick a local folder
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true, title: `Link ${repo.name} to local folder` });
      if (selected && typeof selected === 'string') {
        const repoMap = useSettingsStore.getState().settings.github_repo_paths || {};
        await updateSettings({ github_repo_paths: { ...repoMap, [repo.full_name]: selected } });
      }
    } catch {}
  };

  const handleClone = async (repo: GitHubRepo) => {
    // Default clone target: user's projects folder or home
    const userHome = (await import('@tauri-apps/api/path').then(m => m.homeDir()).catch(() => 'C:\\Users\\Public'));
    const defaultTarget = `${userHome}\\Projects\\${repo.name}`;

    setCloneTarget({ repo, path: defaultTarget });
  };

  const executeClone = async () => {
    if (!cloneTarget) return;
    setCloning(cloneTarget.repo.full_name);
    setCloneTarget(null);
    try {
      await gitClone(cloneTarget.repo.clone_url, cloneTarget.path);
      navigate(cloneTarget.path);
    } catch (e) {
      setReposError(`Clone failed: ${e}`);
    }
    setCloning(null);
  };

  return (
    <div>
      {/* Cloud mount points (expandable) */}
      {cloudMounts.map((m) => (
        <FolderTreeItem
          key={m.path}
          path={m.path}
          label={m.label}
          icon={providerIcon[m.provider] || <IconCloud />}
          depth={0}
          onNavigate={navigate}
          onContextMenu={onContextMenu}
        />
      ))}

      {/* Custom cloud sources from settings (expandable) */}
      {customSources.filter((cs: { enabled: boolean }) => cs.enabled).map((cs: { provider: string; label: string; path: string }, i: number) => (
        <FolderTreeItem
          key={`custom-${i}`}
          path={cs.path}
          label={cs.label}
          icon={providerIcon[cs.provider] || <IconCloud />}
          depth={0}
          onNavigate={navigate}
          onContextMenu={onContextMenu}
        />
      ))}

      {/* GitHub section */}
      <div
        onClick={() => setGithubCollapsed(!githubCollapsed)}
        style={{
          fontSize: 9, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase',
          letterSpacing: '0.08em', padding: '8px 12px 2px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="var(--t3)" strokeWidth="1.5"
            style={{ transition: 'transform 0.15s', transform: githubCollapsed ? 'none' : 'rotate(90deg)' }}>
            <polyline points="2,1 6,4 2,7" />
          </svg>
          GitHub
        </span>
        <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
          {githubPat && (
            <button
              onClick={loadRepos}
              title="Refresh repos"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--t3)', padding: 2, borderRadius: 3, display: 'flex',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path d="M1.5 6a4.5 4.5 0 017.7-3.2M10.5 6a4.5 4.5 0 01-7.7 3.2" />
                <polyline points="9,1 9.2,3.5 7,3" /><polyline points="3,9 2.8,8.5 5,9" />
              </svg>
            </button>
          )}
          <button
            onClick={() => {
              if (githubPat) handleClearPat();
              else setShowPatSetup(!showPatSetup);
            }}
            title={githubPat ? 'Clear PAT' : 'Set PAT'}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: githubPat ? 'var(--green)' : 'var(--t3)', padding: 2, borderRadius: 3, display: 'flex',
            }}
          >
            <IconKey />
          </button>
        </div>
      </div>

      {!githubCollapsed && (
        <>
          {showPatSetup && !githubPat && (
            <PatSetup onSave={handleSavePat} />
          )}

          {githubPat && (
            <GitHubRepoList
              repos={repos}
              loading={reposLoading}
              error={reposError}
              onClone={handleClone}
              onRepoClick={handleRepoClick}
              onLink={handleLink}
              cloning={cloning}
              linkedRepos={githubRepoPaths}
            />
          )}

          {!githubPat && !showPatSetup && (
            <div
              onClick={() => setShowPatSetup(true)}
              style={{
                padding: '4px 12px', fontSize: 'var(--file-font-size-sm, 12px)', color: 'var(--t3)', cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; }}
            >
              Connect GitHub account...
            </div>
          )}
        </>
      )}

      {/* Clone target dialog */}
      {cloneTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}
          onClick={() => setCloneTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, padding: 16, minWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>
              Clone {cloneTarget.repo.full_name}
            </div>
            <div style={{ fontSize: 'var(--file-font-size-sm, 12px)', color: 'var(--t3)', marginBottom: 8 }}>
              Clone destination:
            </div>
            <input
              value={cloneTarget.path}
              onChange={(e) => setCloneTarget({ ...cloneTarget, path: e.target.value })}
              style={{
                width: '100%', background: 'var(--deep)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '6px 8px', color: 'var(--t1)', fontSize: 'var(--file-font-size, 13px)',
                fontFamily: "'JetBrains Mono', monospace", outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              onKeyDown={(e) => { if (e.key === 'Enter') executeClone(); }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCloneTarget(null)}
                style={{
                  background: 'var(--raised)', color: 'var(--t2)',
                  border: 'none', borderRadius: 4, padding: '6px 16px', fontSize: 'var(--file-font-size, 13px)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const { openUrl } = await import('@tauri-apps/plugin-opener');
                  openUrl(cloneTarget.repo.html_url);
                  setCloneTarget(null);
                }}
                title="Open in browser"
                style={{
                  background: 'var(--raised)', color: 'var(--t2)',
                  border: '1px solid var(--border)', borderRadius: 4, padding: '6px 16px', fontSize: 'var(--file-font-size, 13px)', cursor: 'pointer',
                }}
              >
                Browse on GitHub
              </button>
              <button
                onClick={executeClone}
                style={{
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 4, padding: '6px 16px', fontSize: 'var(--file-font-size, 13px)', cursor: 'pointer', fontWeight: 500,
                }}
              >
                Clone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
