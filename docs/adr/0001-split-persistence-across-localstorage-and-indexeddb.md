# 1. Split persistence across localStorage and IndexedDB

- Status: accepted
- Date: 2026-07-06

## Context

Bikespot is offline-first and stores everything on the device. There is no
server. Two kinds of state need to survive a reload:

1. **Structured app data:** the current spot, recent history, and station
   configuration. It's small and JSON-serializable. The app reads it on every
   launch and writes it on every edit.
2. **Photos:** optional evidence attached to a spot. They're binary blobs,
   possibly megabytes each, and the app reads one only when a spot is opened.

`localStorage` is synchronous, stores only strings, and is capped at ~5 MB per
origin. Storing photos in it as base64 would make them ~33% bigger. Every write
would block the main thread, and a handful of spots would push the app toward
the quota. IndexedDB stores `Blob`s natively and asynchronously. But its API is
verbose, and awkward for the small, frequent, synchronous reads of app data.

## Decision

We save the two kinds of state separately, each in the store that suits how the
app reads and writes it:

- **App data → `localStorage`**, as a single JSON blob under one key
  ([`lib/repository.ts`](../../src/lib/repository.ts)). The app checks each
  field when it loads, so a corrupt blob degrades gracefully instead of
  throwing.
- **Photos → IndexedDB**, keyed by an opaque `photoId`
  ([`lib/photos.ts`](../../src/lib/photos.ts)). A `LocationRecord` stores only
  the `photoId` string, and the app fetches the blob when it needs it. When
  IndexedDB is unavailable (e.g. private-mode quirks), photos fall back to an
  in-memory `Map` for the session.

The only link between the two stores is the `photoId` reference. They can get
out of step: a record can point at a blob that failed to write, or a deleted
record can leave its blob behind. So a cleanup pass on load drops references to
missing blobs, and a record never shows a broken image.

## Consequences

- Reading and writing app data stays synchronous and cheap. The common path
  never touches IndexedDB.
- Photos can use the device's whole IndexedDB quota, not localStorage's ~5 MB.
- The cost is two stores that can fall out of sync. The cleanup pass and the
  per-field checks on load pay for that.
- With the in-memory fallback, photos taken in a session without IndexedDB are
  lost on reload. We accept that for a single-device hobby app. It isn't a data
  store people should rely on.
