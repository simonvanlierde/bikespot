import { createId } from "./domain";

const PHOTO_DB_NAME = "bikespot-photos";
const PHOTO_STORE_NAME = "photos";

const memoryPhotoStore = new Map<string, Blob>();

let dbPromise: Promise<IDBDatabase> | null = null;

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function openPhotoDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(PHOTO_DB_NAME, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        request.result.createObjectStore(PHOTO_STORE_NAME);
      }
    };
    request.onsuccess = () => {
      // A future version bump must not hang behind this tab's open connection.
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onblocked = () => {
      dbPromise = null;
      reject(new Error("Photo database is open in another tab"));
    };
    request.onerror = () => {
      // Drop the cached promise so a later call can retry instead of
      // rejecting forever.
      dbPromise = null;
      reject(request.error ?? new Error("Could not open photo database"));
    };
  });

  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openPhotoDb();

  return new Promise<T>((resolve, reject) => {
    const request = run(database.transaction(PHOTO_STORE_NAME, mode).objectStore(PHOTO_STORE_NAME));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Photo store request failed"));
  });
}

// Re-encodes through a canvas so EXIF (GPS, device, timestamp) never reaches
// storage. Falls back to the original file where the APIs are missing.
export async function stripPhotoMetadata(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: blob.type });
  } catch {
    return file;
  }
}

export async function savePhotoBlob(blob: Blob): Promise<string> {
  const photoId = createId();

  if (!hasIndexedDb()) {
    // Session-only fallback; reconcilePhotoBlobs drops the dangling id on the
    // next load so records never keep pointing at a blob that is gone.
    memoryPhotoStore.set(photoId, blob);
    return photoId;
  }

  await withStore("readwrite", (store) => store.put(blob, photoId));
  return photoId;
}

export async function loadPhotoBlob(photoId: string): Promise<Blob | null> {
  if (!hasIndexedDb()) {
    return memoryPhotoStore.get(photoId) ?? null;
  }

  return ((await withStore("readonly", (store) => store.get(photoId))) as Blob | undefined) ?? null;
}

export async function deletePhotoBlob(photoId: string): Promise<void> {
  memoryPhotoStore.delete(photoId);

  if (!hasIndexedDb()) {
    return;
  }

  await withStore("readwrite", (store) => store.delete(photoId));
}

export async function listPhotoIds(): Promise<string[]> {
  if (!hasIndexedDb()) {
    return [...memoryPhotoStore.keys()];
  }

  const keys = await withStore("readonly", (store) => store.getAllKeys());
  return keys.filter((key): key is string => typeof key === "string");
}

export async function clearPhotoBlobs(): Promise<void> {
  memoryPhotoStore.clear();

  if (!hasIndexedDb()) {
    return;
  }

  await withStore("readwrite", (store) => store.clear());
}
