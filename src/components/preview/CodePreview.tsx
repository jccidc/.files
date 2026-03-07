import { useEffect, useState, useRef } from 'react';
import { readTextFile } from '../../api/filesystem';
import { createShikiTheme } from '../../theme/shikiTheme';

interface Props {
  path: string;
  language: string;
}

let highlighterPromise: Promise<any> | null = null;

async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(async ({ createHighlighter }) => {
      const theme = createShikiTheme();
      const highlighter = await createHighlighter({
        themes: [theme],
        langs: [],
      });
      return highlighter;
    });
  }
  return highlighterPromise;
}

export function CodePreview({ path, language }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wordWrap, setWordWrap] = useState(true);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    readTextFile(path, 524288)
      .then(async (content) => {
        if (cancelled) return;
        setRaw(content);
        try {
          const highlighter = await getHighlighter();
          const loadedLangs = highlighter.getLoadedLanguages();
          let lang = language;
          if (!loadedLangs.includes(language)) {
            try {
              await highlighter.loadLanguage(language as any);
            } catch {
              lang = 'plaintext';
              if (!loadedLangs.includes('plaintext')) {
                await highlighter.loadLanguage('plaintext');
              }
            }
          }
          const result = highlighter.codeToHtml(content, {
            lang,
            theme: 'dotfiles',
          });
          if (!cancelled) setHtml(result);
        } catch {
          if (!cancelled) setHtml(null);
        }
      })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [path, language]);

  const handleCopy = () => {
    if (raw) {
      navigator.clipboard.writeText(raw).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--t3)', padding: 16, textAlign: 'center' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--red)', padding: 16 }}>{error}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 12px', borderBottom: '1px solid var(--border)',
        background: 'var(--raised)', fontSize: 11, color: 'var(--t3)',
      }}>
        <span style={{ textTransform: 'uppercase', fontWeight: 500 }}>{language}</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setWordWrap(!wordWrap)}
          style={{
            background: wordWrap ? 'var(--active)' : 'transparent',
            border: '1px solid var(--border)', borderRadius: 3,
            color: 'var(--t2)', fontSize: 10, padding: '2px 8px', cursor: 'pointer',
          }}
        >
          Wrap
        </button>
        <button
          onClick={handleCopy}
          style={{
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 3,
            color: copied ? 'var(--green)' : 'var(--t2)', fontSize: 10,
            padding: '2px 8px', cursor: 'pointer',
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div
        ref={containerRef}
        style={{
          flex: 1, overflow: 'auto', padding: 12,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.6,
        }}
      >
        {html ? (
          <div
            dangerouslySetInnerHTML={{ __html: html }}
            style={{
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
              wordBreak: wordWrap ? 'break-all' : 'normal',
            }}
          />
        ) : (
          <pre style={{
            color: 'var(--t1)', margin: 0,
            whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
            wordBreak: wordWrap ? 'break-all' : 'normal',
          }}>
            {raw}
          </pre>
        )}
      </div>
    </div>
  );
}
