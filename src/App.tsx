import { useEffect, useLayoutEffect } from 'preact/hooks';

import { AppOverlays } from '@/features/app/AppOverlays';
import { CurrentSpotCard } from '@/features/location/CurrentSpotCard';
import { UtilityActions } from '@/features/location/UtilityActions';
import { data, initStore, notice, openOverlay } from '@/lib/store';

export default function App() {
  // Layout effect so hydration resolves before first paint — a passive effect
  // runs after paint and flashes the default demo data at returning users.
  useLayoutEffect(() => initStore(), []);

  const currentNotice = notice.value;

  // Auto-dismiss the status notice a few seconds after it appears. Keyed on
  // the notice object, so repeating the same text still re-arms the timer.
  useEffect(() => {
    if (!currentNotice) {
      return;
    }

    const timeout = setTimeout(() => {
      notice.value = null;
    }, 4000);

    return () => clearTimeout(timeout);
  }, [currentNotice]);

  const current = data.value.current;

  return (
    <main className="app-shell">
      <CurrentSpotCard
        current={current}
        notice={currentNotice?.text ?? ''}
        onEdit={() => openOverlay({ kind: 'edit-location' })}
        onOpenDetails={() => openOverlay({ kind: 'location-details' })}
      />

      <UtilityActions
        recentCount={data.value.recent.length}
        onOpenRecent={() => openOverlay({ kind: 'recent-list' })}
        onOpenStationSettings={() => openOverlay({ kind: 'station-settings' })}
      />

      <AppOverlays />
    </main>
  );
}
