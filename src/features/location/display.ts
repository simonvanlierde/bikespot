import type { Coords, EnabledFields, LocationRecord } from '../../lib/app-data';

export function titleCase(value?: string) {
  if (!value) {
    return '-';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Free-text fields count as present only when non-blank; enums just need a value.
const TEXT_FIELDS = new Set<keyof EnabledFields>(['lane', 'floor', 'rackNumber']);

export function shouldShowEntryField(entry: LocationRecord, field: keyof EnabledFields) {
  if (entry.mode !== 'station') {
    return false;
  }

  const value = entry[field];
  const hasValue = TEXT_FIELDS.has(field)
    ? Boolean((value as string | undefined)?.trim())
    : Boolean(value);

  // Lane is always shown when set; the rest depend on the saved visibility flags.
  return field === 'lane' ? hasValue : entry.visibleFields[field] === true && hasValue;
}

export function showFloor(entry: LocationRecord) {
  if (entry.mode !== 'station' || !entry.floor?.trim()) {
    return false;
  }

  return shouldShowEntryField(entry, 'floor');
}

export function formatTimestamp(value?: string) {
  if (!value) {
    return 'not saved yet';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function getSummary(entry: LocationRecord | null): string {
  if (!entry) {
    return '';
  }

  if (entry.mode === 'outside') {
    return entry.outsideDescription;
  }

  const parts = [
    shouldShowEntryField(entry, 'side') && entry.side ? titleCase(entry.side) : '',
    shouldShowEntryField(entry, 'rackLevel') && entry.rackLevel ? titleCase(entry.rackLevel) : '',
    shouldShowEntryField(entry, 'distance') && entry.distance ? titleCase(entry.distance) : '',
  ].filter(Boolean);

  return parts.join(' · ');
}

export function mapsLink(coords: Coords): string {
  return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
}

export function formatAccuracy(coords: Coords): string {
  return typeof coords.accuracy === 'number' ? `±${coords.accuracy}m` : '';
}

// Headline for a spot: lane when set, otherwise the enabled-field summary, with
// a final fallback so a lane-less station spot still reads sensibly.
export function getPrimaryLabel(entry: LocationRecord | null): string {
  if (!entry) {
    return '';
  }

  if (entry.mode === 'outside') {
    return 'Outside the station';
  }

  if (entry.lane) {
    return `Lane ${entry.lane}`;
  }

  return getSummary(entry) || 'Bike spot';
}
