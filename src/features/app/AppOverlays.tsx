import { RecentLocationPreviewSheet } from "@/features/history/RecentLocationPreviewSheet";
import { RecentLocationsSheet } from "@/features/history/RecentLocationsSheet";
import { LocationDetailsSheet } from "@/features/location/LocationDetailsSheet";
import { LocationEditorSheet } from "@/features/location/LocationEditorSheet";
import { StationSettingsSheet } from "@/features/location/StationSettingsSheet";
import {
  closeOverlay,
  data,
  editorError,
  geoStatus,
  handleCaptureLocation,
  handleClearCurrent,
  handleLocationSubmit,
  handlePhotoChange,
  handlePhotoRemove,
  handleRemoveRecent,
  handleStationChange,
  handleUseRecent,
  locationDraft,
  openOverlay,
  overlay,
  setLocationDraft,
  showEditorDetails,
  stationDraft,
  toggleEditorDetails,
} from "@/lib/store";

export function AppOverlays() {
  const appData = data.value;
  const current = overlay.value;
  const selectedRecent =
    current.kind === "recent-preview"
      ? (appData.recent.find((entry) => entry.id === current.id) ?? null)
      : null;

  return (
    <>
      {current.kind === "edit-location" && locationDraft.value ? (
        <LocationEditorSheet
          formState={locationDraft.value}
          station={appData.station}
          showDetails={showEditorDetails.value}
          geoStatus={geoStatus.value}
          error={editorError.value}
          setFormState={setLocationDraft}
          onClose={closeOverlay}
          onSubmit={handleLocationSubmit}
          onToggleDetails={toggleEditorDetails}
          onPhotoChange={handlePhotoChange}
          onPhotoRemove={handlePhotoRemove}
          onCaptureLocation={handleCaptureLocation}
        />
      ) : null}

      {current.kind === "station-settings" && stationDraft.value ? (
        <StationSettingsSheet
          stationForm={stationDraft.value}
          setStationForm={handleStationChange}
          onClose={closeOverlay}
        />
      ) : null}

      {current.kind === "location-details" ? (
        <LocationDetailsSheet
          current={appData.current}
          onClose={closeOverlay}
          onCollected={handleClearCurrent}
        />
      ) : null}

      {current.kind === "recent-list" ? (
        <RecentLocationsSheet
          recent={appData.recent}
          onClose={closeOverlay}
          onPreview={(id) => openOverlay({ kind: "recent-preview", id })}
        />
      ) : null}

      {selectedRecent ? (
        <RecentLocationPreviewSheet
          selectedRecent={selectedRecent}
          onClose={() => openOverlay({ kind: "recent-list" })}
          onUse={handleUseRecent}
          onRemove={handleRemoveRecent}
        />
      ) : null}
    </>
  );
}
