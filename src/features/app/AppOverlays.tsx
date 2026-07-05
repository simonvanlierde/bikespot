import { RecentLocationPreviewSheet } from '@/features/history/RecentLocationPreviewSheet';
import { RecentLocationsSheet } from '@/features/history/RecentLocationsSheet';
import { LocationDetailsSheet } from '@/features/location/LocationDetailsSheet';
import { LocationEditorSheet } from '@/features/location/LocationEditorSheet';
import { StationSettingsSheet } from '@/features/location/StationSettingsSheet';
import {
  closeOverlay,
  data,
  geoStatus,
  handleCaptureLocation,
  handleLocationSubmit,
  handlePhotoChange,
  handlePhotoRemove,
  handleStationSubmit,
  handleUseRecent,
  locationDraft,
  openOverlay,
  overlay,
  setLocationDraft,
  setStationDraft,
  showEditorDetails,
  stationDraft,
  toggleEditorDetails,
} from '@/lib/store';

export function AppOverlays() {
  const appData = data.value;
  const current = overlay.value;
  const selectedRecent =
    current.kind === 'recent-preview'
      ? (appData.recent.find((entry) => entry.id === current.id) ?? null)
      : null;

  return (
    <>
      {current.kind === 'edit-location' && locationDraft.value ? (
        <LocationEditorSheet
          formState={locationDraft.value}
          station={appData.station}
          showDetails={showEditorDetails.value}
          geoStatus={geoStatus.value}
          setFormState={setLocationDraft}
          onClose={closeOverlay}
          onSubmit={handleLocationSubmit}
          onToggleDetails={toggleEditorDetails}
          onPhotoChange={handlePhotoChange}
          onPhotoRemove={handlePhotoRemove}
          onCaptureLocation={handleCaptureLocation}
        />
      ) : null}

      {current.kind === 'station-settings' && stationDraft.value ? (
        <StationSettingsSheet
          stationForm={stationDraft.value}
          setStationForm={setStationDraft}
          onClose={closeOverlay}
          onSubmit={handleStationSubmit}
        />
      ) : null}

      {current.kind === 'location-details' ? (
        <LocationDetailsSheet current={appData.current} onClose={closeOverlay} />
      ) : null}

      {current.kind === 'recent-list' ? (
        <RecentLocationsSheet
          recent={appData.recent}
          onClose={closeOverlay}
          onPreview={(id) => openOverlay({ kind: 'recent-preview', id })}
        />
      ) : null}

      {selectedRecent ? (
        <RecentLocationPreviewSheet
          selectedRecent={selectedRecent}
          onClose={closeOverlay}
          onUse={handleUseRecent}
        />
      ) : null}
    </>
  );
}
