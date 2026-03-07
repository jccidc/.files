import { useEffect, useState, useRef, useCallback } from 'react';
import { useLayoutStore } from '../../stores/layout';
import { useExplorerStore } from '../../stores/explorer';
import { getDrives } from '../../api/filesystem';

function IconDrive() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--cyan)" strokeWidth="1.3">
      <rect x="2" y="4" width="12" height="8" rx="1.5" />
      <circle cx="11" cy="8" r="1" fill="var(--cyan)" />
      <line x1="4" y1="8" x2="8" y2="8" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--warm)" stroke="none">
      <path d="M1.5 3a1 1 0 011-1H6l1.5 1.5H13.5a1 1 0 011 1V13a1 1 0 01-1 1h-12a1 1 0 01-1-1V3z" />
    </svg>
  );
}

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '5px 12px',
  cursor: 'pointer',
  fontSize: 12,
  color: 'var(--t2)',
  borderRadius: 4,
  margin: '0 6px',
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function SidebarItem({ icon, label, onClick }: SidebarItemProps) {
  return (
    <div
      onClick={onClick}
      style={itemStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--hover)';
        e.currentTarget.style.color = 'var(--t1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--t2)';
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--t3)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        padding: '10px 12px 4px',
      }}
    >
      {text}
    </div>
  );
}

export function Sidebar() {
  const { sidebarWidth, setSidebarWidth } = useLayoutStore();
  const navigate = useExplorerStore((s) => s.navigate);
  const [drives, setDrives] = useState<string[]>([]);
  const resizing = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  useEffect(() => {
    getDrives()
      .then(setDrives)
      .catch(() => setDrives(['C:\\']));
  }, []);

  const quickAccess = [
    { label: 'Home', path: 'C:\\Users' },
    { label: 'Desktop', path: 'C:\\Users\\Public\\Desktop' },
    { label: 'Documents', path: 'C:\\Users\\Public\\Documents' },
    { label: 'Downloads', path: 'C:\\Users\\Public\\Downloads' },
  ];

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      resizing.current = true;
      startX.current = e.clientX;
      startW.current = sidebarWidth;
      e.preventDefault();

      const onMove = (ev: MouseEvent) => {
        if (!resizing.current) return;
        const delta = ev.clientX - startX.current;
        setSidebarWidth(startW.current + delta);
      };

      const onUp = () => {
        resizing.current = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [sidebarWidth, setSidebarWidth]
  );

  return (
    <div
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        <SectionLabel text="Sources" />
        {drives.map((d) => (
          <SidebarItem key={d} icon={<IconDrive />} label={d} onClick={() => navigate(d)} />
        ))}

        <SectionLabel text="Quick Access" />
        {quickAccess.map((qa) => (
          <SidebarItem
            key={qa.path}
            icon={<IconFolder />}
            label={qa.label}
            onClick={() => navigate(qa.path)}
          />
        ))}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: 'absolute',
          top: 0,
          right: -2,
          width: 4,
          height: '100%',
          cursor: 'col-resize',
          zIndex: 10,
        }}
      />
    </div>
  );
}
