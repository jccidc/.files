import { useEffect, useState } from 'react';

interface DriveInfo {
  letter: string;
  label: string;
  total_bytes: number;
  free_bytes: number;
  used_bytes: number;
  file_system: string;
  drive_type: string;
}

interface KnownFolder {
  label: string;
  path: string;
  icon: string;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(0) + ' MB';
  if (bytes < 1024 * 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  return (bytes / (1024 * 1024 * 1024 * 1024)).toFixed(1) + ' TB';
}

interface ThisPcViewProps {
  onNavigate: (path: string) => void;
}

const FOLDER_ICONS: Record<string, string> = {
  Desktop: 'M2 3h12v8H2V3zm-1 9h14v1H1v-1z',
  Documents: 'M3 1.5h7l3 3V14.5H3V1.5zm7 0v3h3',
  Downloads: 'M8 1v8m-3-3l3 3 3-3M3 12h10v2H3v-2z',
  Pictures: 'M2 3h12v10H2V3zm3 7l2-3 2 3 3-4',
  Music: 'M12 2v9a2 2 0 11-2-2h2V4L6 5v7a2 2 0 11-2-2h2V2l8-1',
  Videos: 'M2 3h9v10H2V3zm9 3l4-2v8l-4-2',
};

export function ThisPcView({ onNavigate }: ThisPcViewProps) {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [folders, setFolders] = useState<KnownFolder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load drives using fast Win32 API (no PowerShell)
    import('../../api/filesystem').then(({ getDrives }) => {
      getDrives().then((d: any[]) => {
        setDrives(d.map((drive) => ({
          letter: drive.letter,
          label: drive.label,
          total_bytes: drive.total_bytes || 0,
          free_bytes: drive.free_bytes || 0,
          used_bytes: (drive.total_bytes || 0) - (drive.free_bytes || 0),
          file_system: '',
          drive_type: drive.drive_type,
        })));
        setLoading(false);
      }).catch(() => setLoading(false));
    });

    // Load known folders
    import('../../api/filesystem').then(({ getKnownFolderPaths }) => {
      getKnownFolderPaths().then((pairs: [string, string][]) => {
        const known = pairs.map(([label, path]) => ({ label, path, icon: FOLDER_ICONS[label] || FOLDER_ICONS.Documents }));
        setFolders(known);
      }).catch(() => {});
    });
  }, []);

  const cardStyle: React.CSSProperties = {
    background: 'var(--raised)', border: '1px solid var(--border)',
    borderRadius: 8, padding: 16, cursor: 'pointer',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ padding: 24, overflow: 'auto', height: '100%' }}>
      {/* Folders section */}
      {folders.length > 0 && (
        <>
          <h3 style={{ color: 'var(--t3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: 'inherit' }}>
            Folders
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
            {folders.map((f) => (
              <div
                key={f.path}
                onClick={() => onNavigate(f.path)}
                style={{ ...cardStyle, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.2" style={{ flexShrink: 0 }}>
                  <path d={FOLDER_ICONS[f.label] || FOLDER_ICONS.Documents} />
                </svg>
                <span style={{ color: 'var(--t1)', fontSize: 12, fontWeight: 500 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Drives section */}
      <h3 style={{ color: 'var(--t3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: 'inherit' }}>
        Devices and drives
      </h3>
      {loading && <div style={{ color: 'var(--t3)', fontSize: 12 }}>Loading drives...</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
        {drives.map((drive) => {
          const usedPct = drive.total_bytes > 0 ? (drive.used_bytes / drive.total_bytes) * 100 : 0;
          const isLow = usedPct > 90;
          return (
            <div
              key={drive.letter}
              onClick={() => onNavigate(drive.letter + '\\')}
              style={cardStyle}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: 'var(--deep)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: 'var(--accent)',
                }}>
                  {drive.letter.charAt(0)}
                </div>
                <div>
                  <div style={{ color: 'var(--t1)', fontWeight: 500, fontSize: 14 }}>
                    {drive.label} ({drive.letter})
                  </div>
                  <div style={{ color: 'var(--t3)', fontSize: 11 }}>
                    {drive.file_system} - {drive.drive_type}
                  </div>
                </div>
              </div>
              <div style={{ height: 6, background: 'var(--deep)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${usedPct}%`,
                  background: isLow ? 'var(--red, #f87171)' : 'var(--accent)',
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t3)' }}>
                <span>{formatSize(drive.free_bytes)} free</span>
                <span>{formatSize(drive.total_bytes)} total</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Network section */}
      <h3 style={{ color: 'var(--t3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: 'inherit' }}>
        Network
      </h3>
      <div
        onClick={async () => {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('open_shell_folder', { folder: 'shell:NetworkPlacesFolder' }).catch(() => {});
        }}
        style={{ ...cardStyle, padding: 12, display: 'inline-flex', alignItems: 'center', gap: 10, maxWidth: 200 }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="var(--purple, #a78bfa)" strokeWidth="1.2">
          <rect x="1" y="6" width="5" height="4" rx="0.5" /><rect x="10" y="6" width="5" height="4" rx="0.5" />
          <line x1="8" y1="3" x2="8" y2="13" /><line x1="3.5" y1="6" x2="3.5" y2="3" /><line x1="3.5" y1="3" x2="12.5" y2="3" /><line x1="12.5" y1="6" x2="12.5" y2="3" />
        </svg>
        <span style={{ color: 'var(--t1)', fontSize: 12, fontWeight: 500 }}>Network</span>
      </div>
    </div>
  );
}
