import { useState, useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useLayoutStore } from '../../stores/layout';

function WeatherWidget() {
  const [weather, setWeather] = useState<{ temp: string; condition: string; icon: string } | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const { useSettingsStore } = await import('../../stores/settings');
        const s = useSettingsStore.getState().settings as any;
        const zip = s.weather_zip;
        if (!zip) return;
        const unit = s.weather_unit || 'f';
        const { invoke } = await import('@tauri-apps/api/core');
        const [temp, condition, icon] = await invoke<[string, string, string]>('get_weather', { zip, unit });
        setWeather({ temp, condition, icon });
      } catch {}
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
      {/* Left: app title */}
      <div
        data-tauri-drag-region
        style={{ display: 'flex', alignItems: 'center', paddingLeft: 12, gap: 8, flexShrink: 0 }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
          .files
        </span>
      </div>

      {/* Center: daily verse marquee */}
      <VerseMarquee />

      {/* Right: flip clock */}
      <FlipClock />

      {/* Right: action buttons + window controls */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          style={btnBase}
          onClick={toggleSidebar}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Toggle Sidebar (Ctrl+B)"
        >
          <IconSidebar />
        </button>
        <WeatherWidget />
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
