import { useState, useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useLayoutStore } from '../../stores/layout';

function WeatherWidget() {
  const [weather, setWeather] = useState<{ temp: string; condition: string; icon: string } | null>(null);
  const [noZip, setNoZip] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const { useSettingsStore } = await import('../../stores/settings');
        const s = useSettingsStore.getState().settings as any;
        const zip = s.weather_zip || '';
        const unit = s.weather_unit || 'f';
        const { invoke } = await import('@tauri-apps/api/core');
        // If no zip, use empty string — wttr.in auto-detects by IP
        const [temp, condition, icon] = await invoke<[string, string, string]>('get_weather', { zip, unit });
        if (temp) {
          setWeather({ temp, condition, icon });
          setNoZip(false);
        }
      } catch {
        setNoZip(true);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    // Also re-fetch when settings change (user enters zip)
    let unsub: (() => void) | undefined;
    import('../../stores/settings').then(({ useSettingsStore }) => {
      unsub = useSettingsStore.subscribe((s) => {
        if ((s.settings as any).weather_zip || (s.settings as any).weather_unit) {
          fetchWeather();
        }
      });
    });
    return () => { clearInterval(interval); unsub?.(); };
  }, []);

  if (!weather && !noZip) {
    return (
      <div style={{ fontSize: 10, color: 'var(--t3)', padding: '0 8px', flexShrink: 0 }}>
        Loading...
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      fontSize: 11, color: 'var(--t2)', padding: '0 8px',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 14 }}>{weather.icon}</span>
      <span style={{ fontWeight: 500 }}>{weather.temp}</span>
      <span style={{ color: 'var(--t3)', fontSize: 10 }}>{weather.condition}</span>
    </div>
  );
}

// ---- Flip Clock ----

function FlipDigit({ value, prev }: { value: string; prev: string }) {
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value !== prev) {
      setFlipping(true);
      const t = setTimeout(() => setFlipping(false), 500);
      return () => clearTimeout(t);
    }
  }, [value, prev]);

  const digitStyle: React.CSSProperties = {
    position: 'relative',
    width: 14,
    height: 20,
    background: 'var(--deep)',
    borderRadius: 2,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    color: 'var(--t1)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.3)',
  };

  const halfStyle = (top: boolean): React.CSSProperties => ({
    position: 'absolute',
    left: 0,
    right: 0,
    height: '50%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...(top ? { top: 0, borderBottom: '0.5px solid rgba(0,0,0,0.3)' } : { bottom: 0 }),
  });

  return (
    <div style={digitStyle}>
      <div style={halfStyle(true)}>
        <span style={{ transform: 'translateY(25%)' }}>{value}</span>
      </div>
      <div style={halfStyle(false)}>
        <span style={{ transform: 'translateY(-25%)' }}>{value}</span>
      </div>
      {flipping && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: '50%',
          overflow: 'hidden', transformOrigin: 'bottom',
          animation: 'flip-top 0.3s ease-in forwards',
          zIndex: 2, background: 'var(--deep)', borderRadius: '2px 2px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '0.5px solid rgba(0,0,0,0.3)',
        }}>
          <span style={{ transform: 'translateY(25%)' }}>{prev}</span>
        </div>
      )}
      {flipping && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%',
          overflow: 'hidden', transformOrigin: 'top',
          animation: 'flip-bottom 0.3s ease-out 0.15s forwards',
          zIndex: 2, background: 'var(--deep)', borderRadius: '0 0 2px 2px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0,
        }}>
          <span style={{ transform: 'translateY(-25%)' }}>{value}</span>
        </div>
      )}
    </div>
  );
}

// ---- Widget System ----

// ---- New Widgets ----

function SpotifyWidget() {
  const [track, setTrack] = useState<{ artist: string; title: string; playing: boolean } | null>(null);

  useEffect(() => {
    const fetchSpotify = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const [artist, title, playing] = await invoke<[string, string, boolean]>('get_spotify_status');
        if (playing && artist) {
          setTrack({ artist, title, playing });
        } else {
          setTrack(null);
        }
      } catch { setTrack(null); }
    };
    fetchSpotify();
    const interval = setInterval(fetchSpotify, 5000);
    return () => clearInterval(interval);
  }, []);

  const sendKey = async (key: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('send_media_key', { key });
    } catch {}
  };

  if (!track) return (
    <div style={{ fontSize: 10, color: 'var(--t3)', padding: '0 8px', flexShrink: 0 }}>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="var(--t3)" stroke="none" style={{ opacity: 0.4, marginRight: 4 }}>
        <circle cx="8" cy="8" r="7" />
      </svg>
      <span style={{ opacity: 0.5 }}>Spotify idle</span>
    </div>
  );


  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      fontSize: 11, color: 'var(--t2)', padding: '0 6px',
      flexShrink: 0, minWidth: 180, maxWidth: 350,
      overflow: 'hidden',
    }}>
      {/* Spotify icon */}
      <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--green)" stroke="none" style={{ flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7" />
        <path d="M5 6.5c2.5-0.8 5 0 5 0" stroke="var(--deep)" strokeWidth="1.2" fill="none" />
        <path d="M5 8.5c2-0.6 4 0 4 0" stroke="var(--deep)" strokeWidth="1.2" fill="none" />
        <path d="M5.5 10.5c1.5-0.4 3 0 3 0" stroke="var(--deep)" strokeWidth="1.2" fill="none" />
      </svg>

      {/* Playback controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <button onClick={() => sendKey('prev')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2, display: 'flex' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t2)'; }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="0" y="1" width="2" height="8" /><polygon points="9,1 3,5 9,9" /></svg>
        </button>
        <button onClick={() => sendKey('play')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2, display: 'flex' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t2)'; }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="3" height="8" /><rect x="6" y="1" width="3" height="8" /></svg>
        </button>
        <button onClick={() => sendKey('next')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 2, display: 'flex' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t2)'; }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="1,1 7,5 1,9" /><rect x="8" y="1" width="2" height="8" /></svg>
        </button>
      </div>

      {/* Scrolling track info — always scrolls within fixed width */}
      <div style={{
        width: 160, overflow: 'hidden', position: 'relative', flexShrink: 0,
        maskImage: 'linear-gradient(to right, transparent 0px, black 8px, black calc(100% - 8px), transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0px, black 8px, black calc(100% - 8px), transparent)',
      }}>
        <div style={{
          whiteSpace: 'nowrap',
          animation: 'marquee-scroll 15s linear infinite',
          paddingLeft: '100%',
          fontSize: 11,
        }}>
          <span style={{ fontWeight: 500 }}>{track.title}</span>
          <span style={{ color: 'var(--t3)', margin: '0 6px' }}>--</span>
          <span style={{ color: 'var(--t3)' }}>{track.artist}</span>
        </div>
      </div>
    </div>
  );
}

function SystemStatsWidget() {
  const [stats, setStats] = useState<{ cpu: number; ramUsed: number; ramTotal: number; battery: number | null } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const [cpu, ramUsed, ramTotal, battery] = await invoke<[number, number, number, number | null]>('get_system_stats');
        setStats({ cpu, ramUsed, ramTotal, battery });
      } catch {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  const ramPct = stats.ramTotal > 0 ? Math.round((stats.ramUsed / stats.ramTotal) * 100) : 0;
  const ramGB = (stats.ramUsed / (1024 * 1024 * 1024)).toFixed(1);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 10, color: 'var(--t2)', padding: '0 8px',
      flexShrink: 0,
    }}>
      {/* CPU */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--cyan)" strokeWidth="1.2">
          <rect x="2" y="2" width="8" height="8" rx="1" />
          <line x1="0" y1="5" x2="2" y2="5" /><line x1="0" y1="7" x2="2" y2="7" />
          <line x1="10" y1="5" x2="12" y2="5" /><line x1="10" y1="7" x2="12" y2="7" />
          <line x1="5" y1="0" x2="5" y2="2" /><line x1="7" y1="0" x2="7" y2="2" />
        </svg>
        <span style={{ fontWeight: 500, color: stats.cpu > 80 ? 'var(--red)' : 'var(--t2)' }}>{Math.round(stats.cpu)}%</span>
      </div>
      {/* RAM */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--purple, #a78bfa)" strokeWidth="1.2">
          <rect x="1" y="3" width="10" height="6" rx="1" />
          <rect x="3" y="1" width="2" height="2" rx="0.5" /><rect x="7" y="1" width="2" height="2" rx="0.5" />
        </svg>
        <span>{ramGB}GB</span>
        <span style={{ color: 'var(--t3)' }}>{ramPct}%</span>
      </div>
      {/* Battery */}
      {stats.battery !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <svg width="12" height="10" viewBox="0 0 14 10" fill="none" stroke={stats.battery < 20 ? 'var(--red)' : 'var(--green)'} strokeWidth="1.2">
            <rect x="1" y="1" width="10" height="8" rx="1" />
            <rect x="11" y="3" width="2" height="4" rx="0.5" />
            <rect x="2" y="2" width={Math.max(1, stats.battery / 100 * 8)} height="6" rx="0.5" fill={stats.battery < 20 ? 'var(--red)' : 'var(--green)'} stroke="none" />
          </svg>
          <span>{stats.battery}%</span>
        </div>
      )}
    </div>
  );
}

function DiskSpaceWidget() {
  const [disks, setDisks] = useState<{ letter: string; pct: number }[]>([]);

  useEffect(() => {
    import('../../api/filesystem').then(({ getDrives }) => {
      getDrives().then((drives: any[]) => {
        setDisks(drives.filter((d) => d.total_bytes > 0).map((d) => ({
          letter: d.letter.replace('\\', ''),
          pct: Math.round(((d.total_bytes - d.free_bytes) / d.total_bytes) * 100),
        })));
      }).catch(() => {});
    });
  }, []);

  if (disks.length === 0) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 10, color: 'var(--t2)', padding: '0 8px',
      flexShrink: 0,
    }}>
      {disks.map((d) => (
        <div key={d.letter} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontWeight: 500 }}>{d.letter}</span>
          <div style={{ width: 24, height: 4, background: 'var(--deep)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${d.pct}%`,
              background: d.pct > 90 ? 'var(--red)' : 'var(--accent)',
            }} />
          </div>
          <span style={{ color: 'var(--t3)' }}>{d.pct}%</span>
        </div>
      ))}
    </div>
  );
}

// ---- Widget Registry ----

const WIDGET_REGISTRY: Record<string, { component: React.FC; label: string; flex?: boolean; icon: string; fixed?: boolean }> = {
  verse: { component: VerseMarquee, label: 'Bible Verse', icon: 'book', flex: true },
  clock: { component: FlipClock, label: 'Flip Clock', icon: 'clock' },
  weather: { component: WeatherWidget, label: 'Weather', icon: 'cloud' },
  spotify: { component: SpotifyWidget, label: 'Spotify', icon: 'music' },
  system: { component: SystemStatsWidget, label: 'System Stats', icon: 'cpu' },
  disk: { component: DiskSpaceWidget, label: 'Disk Space', icon: 'disk' },
};

const DEFAULT_TITLEBAR_WIDGETS = ['verse', 'clock', 'weather'];
const DEFAULT_FOOTER_WIDGETS = ['spotify', 'system', 'disk'];

function WidgetSeparator() {
  return <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />;
}

export function TitlebarWidgets() {
  const [widgetOrder, setWidgetOrder] = useState<string[]>(DEFAULT_TITLEBAR_WIDGETS);
  const [alignment, setAlignment] = useState<string>('left');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const widgetRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    import('../../stores/settings').then(({ useSettingsStore }) => {
      const s = useSettingsStore.getState().settings as any;
      if (s.titlebar_widgets && Array.isArray(s.titlebar_widgets)) setWidgetOrder(s.titlebar_widgets);
      if (s.widget_alignment) setAlignment(s.widget_alignment);
      useSettingsStore.subscribe((state) => {
        const ss = state.settings as any;
        if (ss.titlebar_widgets && Array.isArray(ss.titlebar_widgets)) setWidgetOrder(ss.titlebar_widgets);
        if (ss.widget_alignment) setAlignment(ss.widget_alignment);
      });
    });
  }, []);

  const saveOrder = (order: string[]) => {
    import('../../stores/settings').then(({ useSettingsStore }) => {
      useSettingsStore.getState().update({ titlebar_widgets: order } as any);
    });
  };

  const handlePointerDown = (idx: number, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDragIdx(idx);

    const onMove = (ev: PointerEvent) => {
      let overIdx: number | null = null;
      for (let i = 0; i < widgetOrder.length; i++) {
        const el = widgetRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (ev.clientX >= rect.left && ev.clientX < rect.right) {
          overIdx = i;
          break;
        }
      }
      setDragOverIdx(overIdx !== idx ? overIdx : null);
    };

    const onUp = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);

      let targetIdx: number | null = null;
      // Check widget slots + the spacer (index = widgetOrder.length)
      for (let i = 0; i <= widgetOrder.length; i++) {
        const el = widgetRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (ev.clientX >= rect.left && ev.clientX < rect.right) {
          targetIdx = i;
          break;
        }
      }

      if (targetIdx !== null && targetIdx !== idx) {
        const order = [...widgetOrder];
        const [moved] = order.splice(idx, 1);
        order.splice(targetIdx, 0, moved);
        setWidgetOrder(order);
        saveOrder(order);
      }

      setDragIdx(null);
      setDragOverIdx(null);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  // Ensure verse is always present in titlebar
  const ensuredOrder = widgetOrder;

  return (
    <div
      style={{
        flex: 1, display: 'flex', alignItems: 'center',
        height: '100%', overflow: 'hidden', gap: 0,
        justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      {/* Left spacer for center/right alignment */}
      {(alignment === 'center' || alignment === 'right') && (
        <div data-tauri-drag-region style={{ flex: 1, minHeight: '100%' }} />
      )}
      {ensuredOrder.map((id, idx) => {
        const widget = WIDGET_REGISTRY[id];
        if (!widget) return null;
        const Comp = widget.component;
        const isDragging = dragIdx === idx;
        const isDragOver = dragOverIdx === idx;
        return (
          <div
            key={id}
            ref={(el) => { widgetRefs.current[idx] = el; }}
            style={{
              display: 'flex', alignItems: 'center',
              flex: widget.flex ? 1 : undefined,
              opacity: isDragging ? 0.4 : 1,
              borderLeft: isDragOver ? '2px solid var(--accent)' : '2px solid transparent',
              height: '100%',
              minWidth: 0,
            }}
          >
            {/* Drag handle — hidden for fixed widgets like verse */}
            {!widget.fixed && (
              <div
                onPointerDown={(e) => handlePointerDown(idx, e)}
                style={{
                  cursor: 'grab', display: 'flex', alignItems: 'center',
                  padding: '0 4px', flexShrink: 0, touchAction: 'none',
                  opacity: 0.25,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.25'; }}
                title="Drag to reorder"
              >
                <svg width="4" height="10" viewBox="0 0 4 10" fill="var(--t3)" stroke="none">
                  <circle cx="1" cy="1.5" r="0.8" /><circle cx="3" cy="1.5" r="0.8" />
                  <circle cx="1" cy="4.5" r="0.8" /><circle cx="3" cy="4.5" r="0.8" />
                  <circle cx="1" cy="7.5" r="0.8" /><circle cx="3" cy="7.5" r="0.8" />
                </svg>
              </div>
            )}
            <Comp />
            {idx < widgetOrder.length - 1 && <WidgetSeparator />}
          </div>
        );
      })}
      {/* Right spacer for left/center alignment */}
      {(alignment === 'left' || alignment === 'center') && (
        <div data-tauri-drag-region style={{ flex: 1, minHeight: '100%' }} />
      )}
    </div>
  );
}

function FlipClock() {
  const [time, setTime] = useState(() => new Date());
  const [prevTime, setPrevTime] = useState(() => new Date());
  const [is24h, setIs24h] = useState(false);

  useEffect(() => {
    import('../../stores/settings').then(({ useSettingsStore }) => {
      const fmt = (useSettingsStore.getState().settings as any).clock_format;
      if (fmt === '24h') setIs24h(true);
      useSettingsStore.subscribe((s) => {
        setIs24h((s.settings as any).clock_format === '24h');
      });
    });
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      setPrevTime(time);
      setTime(new Date());
    }, 1000);
    return () => clearInterval(tick);
  }, [time]);

  let hours = time.getHours();
  const prevHours = prevTime.getHours();
  let displayHours = hours;
  let prevDisplayHours = prevHours;
  let ampm = '';

  if (!is24h) {
    ampm = hours >= 12 ? 'PM' : 'AM';
    displayHours = hours % 12 || 12;
    prevDisplayHours = prevHours % 12 || 12;
  }

  const h = String(displayHours).padStart(2, '0');
  const ph = String(prevDisplayHours).padStart(2, '0');
  const m = String(time.getMinutes()).padStart(2, '0');
  const pm = String(prevTime.getMinutes()).padStart(2, '0');
  const s = String(time.getSeconds()).padStart(2, '0');
  const ps = String(prevTime.getSeconds()).padStart(2, '0');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2,
      padding: '0 8px', flexShrink: 0,
    }}>
      <style>{`
        @keyframes flip-top {
          0% { transform: perspective(200px) rotateX(0deg); }
          100% { transform: perspective(200px) rotateX(-90deg); }
        }
        @keyframes flip-bottom {
          0% { transform: perspective(200px) rotateX(90deg); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: perspective(200px) rotateX(0deg); opacity: 1; }
        }
      `}</style>
      <FlipDigit value={h[0]} prev={ph[0]} />
      <FlipDigit value={h[1]} prev={ph[1]} />
      <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", opacity: time.getSeconds() % 2 === 0 ? 1 : 0.3 }}>:</span>
      <FlipDigit value={m[0]} prev={pm[0]} />
      <FlipDigit value={m[1]} prev={pm[1]} />
      <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", opacity: time.getSeconds() % 2 === 0 ? 1 : 0.3 }}>:</span>
      <FlipDigit value={s[0]} prev={ps[0]} />
      <FlipDigit value={s[1]} prev={ps[1]} />
      {!is24h && (
        <span style={{ fontSize: 8, color: 'var(--t3)', fontWeight: 600, marginLeft: 2, alignSelf: 'flex-end', lineHeight: '20px' }}>{ampm}</span>
      )}
    </div>
  );
}

function VerseMarquee() {
  const [verse, setVerse] = useState<{ reference: string; text: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import('../../data/dailyVerses').then(({ getDailyVerse }) => {
      setVerse(getDailyVerse());
    }).catch(() => {});
  }, []);

  if (!verse) return null;

  const display = `${verse.text}  —  ${verse.reference}`;

  return (
    <div
      ref={containerRef}
      data-tauri-drag-region
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        maskImage: 'linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)',
      }}
    >
      <div
        ref={textRef}
        style={{
          whiteSpace: 'nowrap',
          fontSize: 11,
          color: 'var(--t3)',
          fontStyle: 'italic',
          animation: 'marquee-scroll 45s linear infinite',
          paddingLeft: '100%',
        }}
      >
        {display}
      </div>
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

const appWindow = getCurrentWindow();

function IconSidebar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="2" width="14" height="12" rx="1.5" />
      <line x1="5.5" y1="2" x2="5.5" y2="14" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
    </svg>
  );
}

function IconMinimize() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <rect x="2" y="5.5" width="8" height="1" />
    </svg>
  );
}

function IconMaximize() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="2" y="2" width="8" height="8" rx="1" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="3" y1="3" x2="9" y2="9" />
      <line x1="9" y1="3" x2="3" y2="9" />
    </svg>
  );
}

const btnBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 40,
  border: 'none',
  background: 'transparent',
  color: 'var(--t2)',
  cursor: 'pointer',
};

interface Props {
  onOpenSettings: () => void;
}

export function Titlebar({ onOpenSettings }: Props) {
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(DEFAULT_TITLEBAR_WIDGETS);

  useEffect(() => {
    import('../../stores/settings').then(({ useSettingsStore }) => {
      const s = useSettingsStore.getState().settings as any;
      if (s.titlebar_widgets && Array.isArray(s.titlebar_widgets)) setEnabledWidgets(s.titlebar_widgets);
      useSettingsStore.subscribe((state) => {
        const ss = state.settings as any;
        if (ss.titlebar_widgets && Array.isArray(ss.titlebar_widgets)) setEnabledWidgets(ss.titlebar_widgets);
      });
    });
  }, []);

  const showClock = enabledWidgets.includes('clock');
  const showVerse = enabledWidgets.includes('verse');
  const showWeather = enabledWidgets.includes('weather');

  return (
    <div
      data-tauri-drag-region
      style={{
        height: 40,
        minHeight: 40,
        background: 'var(--deepest)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Left: .files name + clock */}
      <div
        data-tauri-drag-region
        style={{ display: 'flex', alignItems: 'center', paddingLeft: 12, gap: 6, flexShrink: 0 }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
          .files
        </span>
        {showClock && (
          <>
            <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />
            <FlipClock />
          </>
        )}
      </div>

      {/* Center: Bible verse (flex, takes remaining space) */}
      <div data-tauri-drag-region style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {showVerse && (
          <>
            <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0, margin: '0 4px' }} />
            <VerseMarquee />
            <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0, margin: '0 4px' }} />
          </>
        )}
      </div>

      {/* Right: weather + action buttons + window controls */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {showWeather && <WeatherWidget />}
        <button
          style={btnBase}
          onClick={toggleSidebar}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Toggle Sidebar (Ctrl+B)"
        >
          <IconSidebar />
        </button>
        <button
          style={btnBase}
          onClick={onOpenSettings}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Settings (Ctrl+,)"
        >
          <IconGear />
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />

        <button
          style={btnBase}
          onClick={() => appWindow.minimize()}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Minimize"
        >
          <IconMinimize />
        </button>
        <button
          style={btnBase}
          onClick={() => appWindow.toggleMaximize()}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Maximize"
        >
          <IconMaximize />
        </button>
        <button
          style={{ ...btnBase, width: 42 }}
          onClick={() => appWindow.close()}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--red)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--t2)';
          }}
          title="Close"
        >
          <IconClose />
        </button>
      </div>
    </div>
  );
}

// ---- Footer Bar (hosts widgets user places at bottom) ----

export function FooterWidgets() {
  const [widgetOrder, setWidgetOrder] = useState<string[]>(DEFAULT_FOOTER_WIDGETS);

  useEffect(() => {
    import('../../stores/settings').then(({ useSettingsStore }) => {
      const saved = (useSettingsStore.getState().settings as any).footer_widgets;
      if (saved && Array.isArray(saved)) setWidgetOrder(saved);
      useSettingsStore.subscribe((s) => {
        const w = (s.settings as any).footer_widgets;
        if (w && Array.isArray(w)) setWidgetOrder(w);
      });
    });
  }, []);

  if (widgetOrder.length === 0) return null;

  return (
    <div style={{
      height: 28, minHeight: 28,
      background: 'var(--deepest)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: 0,
      overflow: 'hidden',
    }}>
      {widgetOrder.map((id, idx) => {
        const widget = WIDGET_REGISTRY[id];
        if (!widget) return null;
        const Comp = widget.component;
        return (
          <div key={id} style={{ display: 'flex', alignItems: 'center', flex: widget.flex ? 1 : undefined, minWidth: 0 }}>
            <Comp />
            {idx < widgetOrder.length - 1 && (
              <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
