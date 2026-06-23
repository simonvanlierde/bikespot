import type { AppData, OverlayState } from '../../lib/app-data';

export function getSelectedRecent(
  overlay: OverlayState,
  recent: AppData['recent'],
): AppData['recent'][number] | null {
  if (overlay.kind !== 'recent-preview') {
    return null;
  }

  return recent.find((entry) => entry.id === overlay.id) ?? null;
}
