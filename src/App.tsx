import { useEffect, useLayoutEffect } from "preact/hooks";

import { AppFooter } from "@/components/AppFooter";
import { AppOverlays } from "@/features/app/AppOverlays";
import { CurrentSpotCard } from "@/features/location/CurrentSpotCard";
import { UtilityActions } from "@/features/location/UtilityActions";
import type { Store } from "@/lib/store";

export default function App({ store }: { store: Store }) {
  const { data, notice, openOverlay } = store;
  // Layout effect so saving is wired up before the first paint, and so before
  // any input can change the data.
  useLayoutEffect(() => store.start(), [store]);

  const currentNotice = notice.value;

  // Auto-dismiss a success notice a few seconds after it appears; an error
  // stays until the next action replaces it. Keyed on the notice object, so
  // repeating the same text still re-arms the timer. A notice with undo is
  // dismissed by the store when its undo window ends.
  useEffect(() => {
    if (!currentNotice || currentNotice.tone === "error" || currentNotice.undo) {
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
        notice={currentNotice}
        onEdit={() => openOverlay({ kind: "edit-location" })}
        onOpenDetails={() => openOverlay({ kind: "location-details" })}
      />

      <UtilityActions
        recentCount={data.value.recent.length}
        onOpenRecent={() => openOverlay({ kind: "recent-list" })}
        onOpenStationSettings={() => openOverlay({ kind: "station-settings" })}
      />

      <AppFooter />

      <AppOverlays store={store} />
    </main>
  );
}
