import { startDrag } from '@crabnebula/tauri-plugin-drag';
import { getCurrentWebview } from '@tauri-apps/api/webview';

/**
 * Start a native OS drag operation with the given file paths.
 * This allows dragging files from .files to external apps (Explorer, email, etc.)
 */
export async function startNativeDrag(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  // startDrag requires an icon — use a 1x1 transparent PNG as fallback
  // The OS will show the default file drag cursor anyway
  await startDrag({ item: paths, icon: '' });
}

export type DragDropEventType = 'over' | 'drop' | 'leave';

export interface DragDropPayload {
  type: DragDropEventType;
  paths: string[];
  position: { x: number; y: number };
}

/**
 * Listen for files being dragged INTO the app from external sources.
 * Returns an unlisten function.
 */
export async function onExternalDrop(
  callback: (payload: DragDropPayload) => void
): Promise<() => void> {
  const webview = getCurrentWebview();
  return webview.onDragDropEvent((event) => {
    callback(event.payload as DragDropPayload);
  });
}
