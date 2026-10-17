import { RecentLocationPreviewSheet } from "@/features/history/RecentLocationPreviewSheet";
import { RecentLocationsSheet } from "@/features/history/RecentLocationsSheet";
import { LocationDetailsSheet } from "@/features/location/LocationDetailsSheet";
import { LocationEditorSheet } from "@/features/location/LocationEditorSheet";
import { StationSettingsSheet } from "@/features/location/StationSettingsSheet";
import { t } from "@/lib/i18n";
import type { Store } from "@/lib/store";

export function AppOverlays({ store }: { store: Store }) {
  const appData = store.data.value;
  const current = store.overlay.value;

  switch (current.kind) {
    case "edit-location":
      return (
        <LocationEditorSheet
          formState={current.draft}
          station={appData.station}
          showDetails={current.showDetails}
          geoStatus={current.geoStatus}
          photoMetadataKept={current.photoMetadataKept}
          error={current.error}
          title={appData.current ? t.value.changeLocation : t.value.saveSpot}
          setFormState={store.setLocationDraft}
          onClose={store.closeOverlay}
          onSubmit={store.handleLocationSubmit}
          onToggleDetails={store.toggleEditorDetails}
          onPhotoChange={store.handlePhotoChange}
          onPhotoRemove={store.handlePhotoRemove}
          onCaptureLocation={store.handleCaptureLocation}
        />
      );
    case "station-settings":
      return (
        <StationSettingsSheet
          stationForm={current.draft}
          setStationForm={store.handleStationChange}
          onClose={store.closeOverlay}
          onExportSpots={store.handleExportSpots}
          onImportSpots={store.handleImportSpots}
          onClearAllData={store.handleClearAllData}
        />
      );
    case "location-details":
      return (
        <LocationDetailsSheet
          current={appData.current}
          onClose={store.closeOverlay}
          onCollected={store.handleClearCurrent}
        />
      );
    case "recent-list":
      return (
        <RecentLocationsSheet
          recent={appData.recent}
          onClose={store.closeOverlay}
          onPreview={(id) => store.openOverlay({ kind: "recent-preview", id })}
        />
      );
    case "recent-preview": {
      const selectedRecent = appData.recent.find((entry) => entry.id === current.id);

      return selectedRecent ? (
        <RecentLocationPreviewSheet
          selectedRecent={selectedRecent}
          onClose={() => store.openOverlay({ kind: "recent-list" })}
          onUse={store.handleUseRecent}
          onRemove={store.handleRemoveRecent}
        />
      ) : null;
    }
    default:
      return null;
  }
}
