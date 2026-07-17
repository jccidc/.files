import { useState, useEffect, useRef, useCallback } from 'react';
import { fuzzyFind, type SearchResult } from '../../api/search';
import { useExplorerStore, useActiveExplorerState } from '../../stores/explorer';

export function FuzzySearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { currentPath, tabId: activeTabId } = useActiveExplorerState();
  const navigate = (path: string) => {
    const tid = activeTabId || useExplorerStore.getState().activeTabId;
    if (tid) useExplorerStore.getState().navigate(tid, path);
  };

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const doSearch = useCallback(
    (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      fuzzyFind(currentPath, q, 30)
        .then((r) => {
          setResults(r);
          setSelectedIndex(0);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    },
    [currentPath],
  );

  const handleChange = (value: string) => {
    setQuery(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(value), 150);
  };

  const handleSelect = (result: SearchResult) => {
    if (result.is_dir) {
      navigate(result.path);
    } else {
      const parent = result.path.substring(0, result.path.lastIndexOf('\\'));
      if (parent) navigate(parent);
    }
    onClose();
  };

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: 80,
        background: 'rgba(0,0,0,0.5)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(520px, 90vw)',
          maxHeight: 420,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="var(--t3)"
            strokeWidth="1.5"
            style={{ marginLeft: 16, flexShrink: 0 }}
          >
            <circle cx="7" cy="7" r="4.5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '12px 12px',
              fontSize: 14,
              color: 'var(--t1)',
              outline: 'none',
            }}
          />
          {searching && (
            <span style={{ marginRight: 12, fontSize: 11, color: 'var(--t3)' }}>...</span>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {results.map((r, i) => (
            <div
              key={r.path}
              onClick={() => handleSelect(r)}
              onMouseEnter={() => setSelectedIndex(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 16px',
                cursor: 'pointer',
                background: i === selectedIndex ? 'var(--active)' : 'transparent',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill={r.is_dir ? 'var(--yellow)' : 'none'}
                stroke={r.is_dir ? 'none' : 'var(--t3)'}
                strokeWidth="1.2"
              >
                {r.is_dir ? (
                  <path d="M1.5 3a1 1 0 011-1H6l1.5 1.5H13.5a1 1 0 011 1V13a1 1 0 01-1 1h-12a1 1 0 01-1-1V3z" />
                ) : (
                  <path d="M4 1.5h5l3.5 3.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1z" />
                )}
              </svg>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--t1)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--t3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.path}
                </div>
              </div>
            </div>
          ))}
          {query && !searching && results.length === 0 && (
            <div style={{ padding: 16, color: 'var(--t3)', textAlign: 'center', fontSize: 13 }}>
              No files found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
