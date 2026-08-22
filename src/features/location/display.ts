import { computed } from "@preact/signals";
import type { Coords, EnabledFields, LocationRecord } from "@/lib/app-data";
import { lang, t } from "@/lib/i18n";

export function titleCase(value?: string) {
  if (!value) {
    return "-";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Free-text fields count as present only when non-blank; enums just need a value.
const TEXT_FIELDS = new Set<keyof EnabledFields>(["lane", "floor", "rackNumber"]);

export function shouldShowEntryField(entry: LocationRecord, field: keyof EnabledFields) {
  if (entry.mode !== "station") {
    return false;
  }

  const value = entry[field];
  const hasValue = TEXT_FIELDS.has(field)
    ? Boolean((value as string | undefined)?.trim())
    : Boolean(value);

  // Lane is always shown when set; the rest depend on the saved visibility flags.
  return field === "lane" ? hasValue : entry.visibleFields[field] === true && hasValue;
}

export function showFloor(entry: LocationRecord) {
  return shouldShowEntryField(entry, "floor");
}

// Memoized per language: Intl.DateTimeFormat construction is far pricier than
// .format() and this runs per entry on every recent-list render.
const timestampFormat = computed(
  () => new Intl.DateTimeFormat(lang.value, { dateStyle: "medium", timeStyle: "short" }),
);

export function formatTimestamp(value?: string) {
  if (!value) {
    return t.value.notSaved;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return t.value.notSaved;
  }

  return timestampFormat.value.format(date);
}

export function getSummary(entry: LocationRecord | null): string {
  if (!entry) {
    return "";
  }

  if (entry.mode === "outside") {
    return entry.outsideDescription ?? "";
  }

  const parts = [
    shouldShowEntryField(entry, "side") && entry.side ? t.value.opts[entry.side] : "",
    shouldShowEntryField(entry, "rackLevel") && entry.rackLevel
      ? t.value.opts[entry.rackLevel]
      : "",
    shouldShowEntryField(entry, "distance") && entry.distance ? t.value.opts[entry.distance] : "",
  ].filter(Boolean);

  return parts.join(" · ");
}

export function mapsLink(coords: Coords): string {
  return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
}

export function formatAccuracy(coords: Coords): string {
  return typeof coords.accuracy === "number" ? `±${coords.accuracy}m` : "";
}

// Which field earns the headline: the most specific primary locator that's
// filled — a rack number pinpoints a spot, a lane names a zone. Everything else
// (floor, side, level, distance) is a supporting detail, not a headline.
export function getPrimaryFieldKey(entry: LocationRecord): "rackNumber" | "lane" | null {
  if (entry.mode !== "station") {
    return null;
  }

  if (shouldShowEntryField(entry, "rackNumber")) {
    return "rackNumber";
  }

  if (shouldShowEntryField(entry, "lane")) {
    return "lane";
  }

  return null;
}

export function getPrimaryLabel(entry: LocationRecord | null): string {
  if (!entry) {
    return "";
  }

  if (entry.mode === "outside") {
    return t.value.outsideStation;
  }

  const key = getPrimaryFieldKey(entry);

  if (key === "rackNumber") {
    return t.value.rackN(entry.rackNumber);
  }

  if (key === "lane") {
    return t.value.laneN(entry.lane);
  }

  return t.value.bikeSpot;
}

// Supporting details as labeled facts in broad → specific order, each carrying
// its own category word so it reads on its own. Skips whichever field became the
// headline so it isn't repeated.
export function getDetailFacts(entry: LocationRecord): string[] {
  if (entry.mode !== "station") {
    return [];
  }

  const primary = getPrimaryFieldKey(entry);
  const facts: string[] = [];

  if (shouldShowEntryField(entry, "floor")) {
    facts.push(t.value.stationFloorN(entry.floor));
  }

  if (primary !== "lane" && shouldShowEntryField(entry, "lane")) {
    facts.push(t.value.laneN(entry.lane));
  }

  if (shouldShowEntryField(entry, "distance") && entry.distance) {
    facts.push(t.value.factDistance(t.value.opts[entry.distance]));
  }

  if (shouldShowEntryField(entry, "side") && entry.side) {
    facts.push(t.value.factSide(entry.side));
  }

  if (shouldShowEntryField(entry, "rackLevel") && entry.rackLevel) {
    facts.push(t.value.factRack(entry.rackLevel));
  }

  if (primary !== "rackNumber" && shouldShowEntryField(entry, "rackNumber")) {
    facts.push(t.value.rackN(entry.rackNumber));
  }

  return facts;
}
