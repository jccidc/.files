import { useEffect, useState } from 'react';
import { marked } from 'marked';
import { readTextFile } from '../../api/filesystem';

interface Props {
  path: string;
}

marked.setOptions({
  gfm: true,
  breaks: true,
});

export function MarkdownPreview({ path }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    readTextFile(path, 524288)
      .then(async (content) => {
        if (cancelled) return;
        const result = await marked.parse(content);
        setHtml(result);
      })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [path]);

  if (loading) {
    return <div style={{ color: 'var(--t3)', padding: 16, textAlign: 'center' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: 'var(--red)', padding: 16 }}>{error}</div>;
  }

  return (
    <div
      className="markdown-preview"
      style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}
      dangerouslySetInnerHTML={{ __html: html || '' }}
    />
  );
}
