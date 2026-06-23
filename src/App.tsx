import { useEffect } from 'preact/hooks';

import { AppOverlays } from './features/app/AppOverlays';
import { CurrentSpotCard } from './features/location/CurrentSpotCard';
import { getSupportingSummary } from './features/location/display';
import { UtilityActions } from './features/location/UtilityActions';
import { data, initStore, notice, openOverlay } from './lib/store';

export default function App() {
  useEffect(() => initStore(), []);

  const current = data.value.current;

  return (
    <main className="app-shell">
      <CurrentSpotCard
        current={current}
        notice={notice.value}
        supportingSummary={getSupportingSummary(current, '')}
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
