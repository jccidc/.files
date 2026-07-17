import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#f87171', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' }}>
          <h2 style={{ color: '#fff' }}>Render Error</h2>
          <p>{this.state.error.message}</p>
          <pre>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

window.addEventListener('error', (e) => {
  document.body.innerHTML = `<pre style="padding:24px;color:#f87171;font-family:monospace">${e.message}\n${e.error?.stack || ''}</pre>`;
});

window.addEventListener('unhandledrejection', (e) => {
  document.body.innerHTML = `<pre style="padding:24px;color:#f87171;font-family:monospace">Unhandled rejection: ${e.reason}\n${e.reason?.stack || ''}</pre>`;
});

// Suppress native WebView2 context menu globally, but allow it on text inputs
// and on highlighted text (so Copy is reachable by mouse, e.g. in previews)
document.addEventListener('contextmenu', (e) => {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed && sel.containsNode(e.target as Node, true)) return;
  e.preventDefault();
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
