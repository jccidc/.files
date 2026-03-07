import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { spawnPty, writePty, killPty, onPtyOutput } from '../../api/terminal';
import { useSettingsStore } from '../../stores/settings';
import type { Tab } from '../../types';

import '@xterm/xterm/css/xterm.css';

export function TerminalTab({ tab }: { tab: Tab }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const idRef = useRef(tab.id);
  const spawnedRef = useRef(false);

  const settings = useSettingsStore((s) => s.settings);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: settings.terminal_font_size,
      theme: {
        background: '#08090C',
        foreground: '#D8DEE9',
        cursor: '#3B82F6',
        selectionBackground: 'rgba(59, 130, 246, 0.3)',
        black: '#08090C',
        red: '#F87171',
        green: '#4ADE80',
        yellow: '#FBBF24',
        blue: '#3B82F6',
        magenta: '#C084FC',
        cyan: '#22D3EE',
        white: '#D8DEE9',
        brightBlack: '#4C5567',
        brightRed: '#F87171',
        brightGreen: '#4ADE80',
        brightYellow: '#FBBF24',
        brightBlue: '#3B82F6',
        brightMagenta: '#C084FC',
        brightCyan: '#22D3EE',
        brightWhite: '#FFFFFF',
      },
      cursorBlink: true,
      cursorStyle: 'bar',
      allowProposedApi: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);

    // Small delay to allow DOM to settle before first fit
    requestAnimationFrame(() => {
      fit.fit();

      if (!spawnedRef.current) {
        spawnedRef.current = true;
        const { rows, cols } = term;
        spawnPty(idRef.current, settings.terminal_shell, rows, cols, tab.path).catch((err) => {
          term.writeln(`\r\n\x1b[31mFailed to spawn shell: ${err}\x1b[0m`);
        });
      }
    });

    termRef.current = term;
    fitRef.current = fit;

    // Listen for pty output
    let unlisten: (() => void) | undefined;
    onPtyOutput(idRef.current, (data) => {
      term.write(data);
    }).then((fn) => {
      unlisten = fn;
    });

    // Forward user input to pty
    const onData = term.onData((data) => {
      writePty(idRef.current, data).catch(() => {});
    });

    // Resize observer
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (fitRef.current) {
          fitRef.current.fit();
        }
      });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      onData.dispose();
      if (unlisten) unlisten();
      killPty(idRef.current).catch(() => {});
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        background: 'var(--terminal-bg, var(--void))',
        padding: 4,
        overflow: 'hidden',
      }}
    />
  );
}
