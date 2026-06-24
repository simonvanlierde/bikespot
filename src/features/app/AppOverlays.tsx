import {
  closeOverlay,
  data,
  geoStatus,
  handleCaptureLocation,
  handleLocationSubmit,
  handlePhotoChange,
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
} from '../../lib/store';
import { RecentLocationPreviewSheet } from '../history/RecentLocationPreviewSheet';
import { RecentLocationsSheet } from '../history/RecentLocationsSheet';
import { LocationDetailsSheet } from '../location/LocationDetailsSheet';
import { LocationEditorSheet } from '../location/LocationEditorSheet';
import { StationSettingsSheet } from '../location/StationSettingsSheet';
import { getSelectedRecent } from './overlay-state';

export function AppOverlays() {
  const appData = data.value;
  const current = overlay.value;
  const selectedRecent = getSelectedRecent(current, appData.recent);

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
