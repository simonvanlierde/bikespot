# 1. Split persistence across localStorage and IndexedDB

- Status: accepted
- Date: 2026-07-06

## Context

Bikespot is offline-first and stores everything on the device — there is no
server. Two kinds of state need to survive a reload:

1. **Structured app data** — the current spot, recent history, and station
   configuration. Small, JSON-serializable, read on every launch, written on
   every edit.
2. **Photos** — optional evidence attached to a spot. Binary blobs, potentially
   megabytes each, read only when a spot is opened.

`localStorage` is synchronous, string-only, and capped at ~5 MB per origin.
Serializing photos into it (as base64) would inflate them ~33%, block the main
thread on every write, and race the app toward the quota after a handful of
spots. IndexedDB stores `Blob`s natively and asynchronously, but its API is
verbose and awkward for the small, hot, synchronous reads of app data.

## Decision

Persist the two stores separately, by their access shape rather than in one
place:

- **App data → `localStorage`**, as a single JSON blob under one key
  ([`lib/repository.ts`](../../src/lib/repository.ts)). Loads are validated
  field-by-field so a corrupt blob degrades gracefully instead of throwing.
- **Photos → IndexedDB**, keyed by an opaque `photoId`
  ([`lib/photos.ts`](../../src/lib/photos.ts)). A `LocationRecord` stores only
  the `photoId` string; the blob is fetched on demand. When IndexedDB is
  unavailable (e.g. private-mode quirks), photos fall back to an in-memory
  `Map` for the session.

The two stores are linked only by the `photoId` reference. Because they can
drift — a record can point at a blob that failed to write, or a blob can be
orphaned by a deleted record — a reconciliation pass on load drops dangling
references so a record never renders a broken image.

## Consequences

- App-data reads and writes stay synchronous and cheap; the common path never
  touches IndexedDB.
- Photos scale to the device's IndexedDB quota, not localStorage's ~5 MB.
- The cost is two stores that can fall out of sync, paid for by the
  reconciliation pass and the field-by-field validation on load.
- The in-memory fallback means photos taken in a session without IndexedDB are
  lost on reload — an accepted limit for a single-device hobby app, not a data
  store people should rely on.
