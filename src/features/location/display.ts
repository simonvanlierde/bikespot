import type { Coords, EnabledFields, LocationRecord } from '@/lib/app-data';

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
  return shouldShowEntryField(entry, 'floor');
}

// Hoisted: Intl.DateTimeFormat construction is far pricier than .format() and
// this runs per entry on every recent-list render.
const timestampFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatTimestamp(value?: string) {
  if (!value) {
    return 'not saved yet';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'not saved yet';
  }

  return timestampFormat.format(date);
}

export function getSummary(entry: LocationRecord | null): string {
  if (!entry) {
    return '';
  }

  if (entry.mode === 'outside') {
    return entry.outsideDescription ?? '';
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

// Which field earns the headline: the most specific primary locator that's
// filled — a rack number pinpoints a spot, a lane names a zone. Everything else
// (floor, side, level, distance) is a supporting detail, not a headline.
export function getPrimaryFieldKey(entry: LocationRecord): 'rackNumber' | 'lane' | null {
  if (entry.mode !== 'station') {
    return null;
  }

  if (shouldShowEntryField(entry, 'rackNumber')) {
    return 'rackNumber';
  }

  if (shouldShowEntryField(entry, 'lane')) {
    return 'lane';
  }

  return null;
}

export function getPrimaryLabel(entry: LocationRecord | null): string {
  if (!entry) {
    return '';
  }

  if (entry.mode === 'outside') {
    return 'Outside the station';
  }

  const key = getPrimaryFieldKey(entry);

  if (key === 'rackNumber') {
    return `Rack ${entry.rackNumber}`;
  }

  if (key === 'lane') {
    return `Lane ${entry.lane}`;
  }

  return 'Bike spot';
}

// Supporting details as labeled facts in broad → specific order, each carrying
// its own category word so it reads on its own. Skips whichever field became the
// headline so it isn't repeated.
export function getDetailFacts(entry: LocationRecord): string[] {
  if (entry.mode !== 'station') {
    return [];
  }

  const primary = getPrimaryFieldKey(entry);
  const facts: string[] = [];

  if (shouldShowEntryField(entry, 'floor')) {
    facts.push(`Station floor ${entry.floor}`);
  }

  if (primary !== 'lane' && shouldShowEntryField(entry, 'lane')) {
    facts.push(`Lane ${entry.lane}`);
  }

  if (shouldShowEntryField(entry, 'distance') && entry.distance) {
    facts.push(`${titleCase(entry.distance)} distance`);
  }

  if (shouldShowEntryField(entry, 'side') && entry.side) {
    facts.push(`${titleCase(entry.side)} side`);
  }

  if (shouldShowEntryField(entry, 'rackLevel') && entry.rackLevel) {
    facts.push(`${titleCase(entry.rackLevel)} rack`);
  }

  if (primary !== 'rackNumber' && shouldShowEntryField(entry, 'rackNumber')) {
    facts.push(`Rack ${entry.rackNumber}`);
  }

  return facts;
}
