import { useEffect, useState } from 'react';
import { useGitStore } from '../../stores/git';
import { useExplorerStore } from '../../stores/explorer';
import type { GitFileStatus, GitDiffFile } from '../../api/git';

// ---- Icons ----

function IconBranch() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--accent)" strokeWidth="1.3">
      <circle cx="3" cy="3" r="1.5" /><circle cx="3" cy="9" r="1.5" />
      <circle cx="9" cy="3" r="1.5" /><line x1="3" y1="4.5" x2="3" y2="7.5" />
      <path d="M9 4.5C9 6 7 6 3 7.5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="5" y1="1" x2="5" y2="9" /><line x1="1" y1="5" x2="9" y2="5" />
    </svg>
  );
}

function IconMinus() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="1" y1="5" x2="9" y2="5" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M1.5 6a4.5 4.5 0 017.7-3.2M10.5 6a4.5 4.5 0 01-7.7 3.2" />
      <polyline points="9,1 9.2,3.5 7,3" /><polyline points="3,9 2.8,8.5 5,9" />
    </svg>
  );
}

function IconDiscard() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M2 3h6M3.5 3V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5V3M4 4.5v3M6 4.5v3" />
      <path d="M2.5 3l.3 5a1 1 0 001 1h2.4a1 1 0 001-1l.3-5" />
    </svg>
  );
}

// ---- Status colors ----

const statusColors: Record<string, string> = {
  modified: 'var(--yellow)',
  added: 'var(--green)',
  deleted: 'var(--red)',
  renamed: 'var(--cyan)',
  untracked: 'var(--t3)',
  conflict: 'var(--red)',
  typechange: 'var(--purple)',
};

const statusLetters: Record<string, string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  untracked: '?',
  conflict: '!',
  typechange: 'T',
};

// ---- Diff Viewer ----

function DiffViewer({ files }: { files: GitDiffFile[] }) {
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  if (files.length === 0) {
    return <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--t3)' }}>No changes</div>;
  }

  return (
    <div style={{ fontSize: 11 }}>
      {files.map((f) => (
        <div key={f.path}>
          <div
            onClick={() => setExpandedFile(expandedFile === f.path ? null : f.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', cursor: 'pointer', color: 'var(--t2)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ color: statusColors[f.status] || 'var(--t3)', fontWeight: 600, fontSize: 10, flexShrink: 0 }}>
              {statusLetters[f.status] || '?'}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {f.path}
            </span>
            <span style={{ color: 'var(--green)', fontSize: 10, flexShrink: 0 }}>+{f.additions}</span>
            <span style={{ color: 'var(--red)', fontSize: 10, flexShrink: 0 }}>-{f.deletions}</span>
          </div>
          {expandedFile === f.path && f.hunks.length > 0 && (
            <div style={{
              background: 'var(--deep)', borderLeft: '2px solid var(--border)',
              margin: '0 8px 4px', borderRadius: 3, overflow: 'auto', maxHeight: 300,
            }}>
              {f.hunks.map((hunk, hi) => (
                <div key={hi}>
                  <div style={{ padding: '2px 8px', color: 'var(--cyan)', fontSize: 10, background: 'var(--deepest)' }}>
                    {hunk.header}
                  </div>
                  {hunk.lines.map((line, li) => (
                    <div
                      key={li}
                      style={{
                        padding: '0 8px',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        lineHeight: '16px',
                        whiteSpace: 'pre',
                        background: line.origin === '+' ? 'rgba(74,222,128,0.08)' :
                                    line.origin === '-' ? 'rgba(248,113,113,0.08)' : 'transparent',
                        color: line.origin === '+' ? 'var(--green)' :
                               line.origin === '-' ? 'var(--red)' : 'var(--t2)',
                      }}
                    >
                      <span style={{ display: 'inline-block', width: 32, color: 'var(--t3)', textAlign: 'right', marginRight: 8, userSelect: 'none' }}>
                        {line.old_lineno ?? ' '}
                      </span>
                      <span style={{ display: 'inline-block', width: 32, color: 'var(--t3)', textAlign: 'right', marginRight: 8, userSelect: 'none' }}>
                        {line.new_lineno ?? ' '}
                      </span>
                      <span style={{ userSelect: 'none', marginRight: 4 }}>{line.origin}</span>
                      {line.content}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---- File Status Row ----

function FileStatusRow({
  file,
  onStage,
  onUnstage,
  onDiscard,
}: {
  file: GitFileStatus;
  onStage?: () => void;
  onUnstage?: () => void;
  onDiscard?: () => void;
}) {
  const fileName = file.path.split('/').pop() || file.path;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '3px 12px', fontSize: 12, color: 'var(--t2)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{
        color: statusColors[file.status] || 'var(--t3)',
        fontWeight: 600, fontSize: 10, width: 12, textAlign: 'center', flexShrink: 0,
      }}>
        {statusLetters[file.status] || '?'}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
        title={file.path}
      >
        {fileName}
      </span>
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        {!file.staged && onDiscard && (
          <button onClick={onDiscard} title="Discard changes" style={actionBtnStyle}>
            <IconDiscard />
          </button>
        )}
        {file.staged && onUnstage ? (
          <button onClick={onUnstage} title="Unstage" style={actionBtnStyle}>
            <IconMinus />
          </button>
        ) : !file.staged && onStage ? (
          <button onClick={onStage} title="Stage" style={actionBtnStyle}>
            <IconPlus />
          </button>
        ) : null}
      </div>
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--t3)', padding: 2, borderRadius: 3, display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};

// ---- Section Header ----

function SectionHeader({
  label,
  count,
  actions,
}: {
  label: string;
  count: number;
  actions?: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 12px 2px', fontSize: 10, fontWeight: 600,
      color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>
      <span>{label} ({count})</span>
      {actions && <div style={{ display: 'flex', gap: 4 }}>{actions}</div>}
    </div>
  );
}

// ---- Main GitPanel ----

export function GitPanel() {
  const currentPath = useExplorerStore((s) => s.currentPath);
  const {
    repoInfo, files, diff, loading, error, commitMessage,
    checkRepo, refreshStatus, loadDiff, stage, unstage, commit, discard,
    setCommitMessage,
  } = useGitStore();

  const [showDiff, setShowDiff] = useState(false);
  const [diffStaged, setDiffStaged] = useState(false);

  // Check repo on path change
  useEffect(() => {
    checkRepo(currentPath);
  }, [currentPath]);

  if (!repoInfo?.is_repo) {
    return (
      <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--t3)' }}>
        Not a git repository
      </div>
    );
  }

  const repoRoot = repoInfo.root || currentPath;
  const staged = files.filter((f) => f.staged);
  const unstaged = files.filter((f) => !f.staged);

  const handleStageAll = () => {
    const paths = unstaged.map((f) => f.path);
    if (paths.length) stage(repoRoot, paths);
  };

  const handleUnstageAll = () => {
    const paths = staged.map((f) => f.path);
    if (paths.length) unstage(repoRoot, paths);
  };

  const handleCommit = () => {
    commit(repoRoot);
  };

  const handleViewDiff = (isStaged: boolean) => {
    setDiffStaged(isStaged);
    setShowDiff(true);
    loadDiff(repoRoot, isStaged);
  };

  return (
    <div style={{ fontSize: 12 }}>
      {/* Branch info */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderBottom: '1px solid var(--border)',
      }}>
        <IconBranch />
        <span style={{ color: 'var(--t1)', fontWeight: 500, fontSize: 12 }}>
          {repoInfo.branch || 'HEAD'}
        </span>
        {repoInfo.has_remote && (repoInfo.ahead > 0 || repoInfo.behind > 0) && (
          <span style={{ fontSize: 10, color: 'var(--t3)' }}>
            {repoInfo.ahead > 0 && <span style={{ color: 'var(--green)' }}>+{repoInfo.ahead}</span>}
            {repoInfo.ahead > 0 && repoInfo.behind > 0 && ' '}
            {repoInfo.behind > 0 && <span style={{ color: 'var(--red)' }}>-{repoInfo.behind}</span>}
          </span>
        )}
        <button
          onClick={() => refreshStatus(repoRoot)}
          title="Refresh"
          style={{ ...actionBtnStyle, marginLeft: 'auto' }}
        >
          <IconRefresh />
        </button>
      </div>

      {error && (
        <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--red)' }}>{error}</div>
      )}

      {loading && (
        <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--t3)' }}>Loading...</div>
      )}

      {/* Staged changes */}
      <SectionHeader
        label="Staged Changes"
        count={staged.length}
        actions={
          staged.length > 0 ? (
            <button onClick={handleUnstageAll} title="Unstage all" style={actionBtnStyle}>
              <IconMinus />
            </button>
          ) : undefined
        }
      />
      {staged.length > 0 ? (
        <>
          {staged.map((f) => (
            <FileStatusRow
              key={`s-${f.path}`}
              file={f}
              onUnstage={() => unstage(repoRoot, [f.path])}
            />
          ))}
          <div style={{ padding: '2px 12px' }}>
            <button
              onClick={() => handleViewDiff(true)}
              style={{ ...diffBtnStyle, color: showDiff && diffStaged ? 'var(--accent)' : 'var(--t3)' }}
            >
              View staged diff
            </button>
          </div>
        </>
      ) : (
        <div style={{ padding: '2px 12px', fontSize: 11, color: 'var(--t3)' }}>No staged changes</div>
      )}

      {/* Unstaged changes */}
      <SectionHeader
        label="Changes"
        count={unstaged.length}
        actions={
          unstaged.length > 0 ? (
            <button onClick={handleStageAll} title="Stage all" style={actionBtnStyle}>
              <IconPlus />
            </button>
          ) : undefined
        }
      />
      {unstaged.length > 0 ? (
        <>
          {unstaged.map((f) => (
            <FileStatusRow
              key={`u-${f.path}`}
              file={f}
              onStage={() => stage(repoRoot, [f.path])}
              onDiscard={f.status !== 'untracked' ? () => discard(repoRoot, [f.path]) : undefined}
            />
          ))}
          <div style={{ padding: '2px 12px' }}>
            <button
              onClick={() => handleViewDiff(false)}
              style={{ ...diffBtnStyle, color: showDiff && !diffStaged ? 'var(--accent)' : 'var(--t3)' }}
            >
              View unstaged diff
            </button>
          </div>
        </>
      ) : (
        <div style={{ padding: '2px 12px', fontSize: 11, color: 'var(--t3)' }}>Working tree clean</div>
      )}

      {/* Diff view */}
      {showDiff && diff && (
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 4 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '4px 12px', fontSize: 10, color: 'var(--t3)',
          }}>
            <span>{diffStaged ? 'Staged' : 'Unstaged'} Diff</span>
            <button
              onClick={() => setShowDiff(false)}
              style={{ ...actionBtnStyle, fontSize: 10 }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
              </svg>
            </button>
          </div>
          <DiffViewer files={diff.files} />
        </div>
      )}

      {/* Commit box */}
      {staged.length > 0 && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message..."
            rows={3}
            style={{
              width: '100%', background: 'var(--deep)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '6px 8px', color: 'var(--t1)', fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace", resize: 'vertical', outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
          <button
            onClick={handleCommit}
            disabled={!commitMessage.trim()}
            style={{
              width: '100%', marginTop: 4, padding: '6px 12px',
              background: commitMessage.trim() ? 'var(--accent)' : 'var(--raised)',
              color: commitMessage.trim() ? '#fff' : 'var(--t3)',
              border: 'none', borderRadius: 4, cursor: commitMessage.trim() ? 'pointer' : 'not-allowed',
              fontSize: 12, fontWeight: 500,
            }}
          >
            Commit ({staged.length} file{staged.length !== 1 ? 's' : ''})
          </button>
        </div>
      )}
    </div>
  );
}

const diffBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 11, padding: '2px 0',
};
