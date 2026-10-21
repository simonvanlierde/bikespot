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

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openPhotoDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE_NAME, mode);
    const request = run(transaction.objectStore(PHOTO_STORE_NAME));
    const fail = () => reject(request.error ?? transaction.error ?? new Error("Photo store request failed"));

    // A write is durable only once its transaction commits; a request can
    // succeed and still be rolled back by an abort.
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = fail;
    transaction.onabort = fail;
  });
}

const FILE_EXTENSION = /\.[^.]+$/;
// Long edge in px: enough to read a rack number on a phone screen, about a
// tenth of the bytes of a 12 MP original.
export const PHOTO_MAX_EDGE = 1600;
const PHOTO_QUALITY = 0.8;

// Downscales and re-encodes through a canvas, which also keeps EXIF (GPS,
// device, timestamp) out of storage. Resolves to null where the APIs are missing
// or decoding fails (HEIC in most browsers), so the caller can keep the original
// file and tell the user its metadata stayed.
export async function downscalePhoto(file: File): Promise<File | null> {
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") {
    return null;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = new OffscreenCanvas(
      Math.max(1, Math.round(bitmap.width * scale)),
      Math.max(1, Math.round(bitmap.height * scale)),
    );
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return null;
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    let blob = await canvas.convertToBlob({ type: "image/webp", quality: PHOTO_QUALITY });
    // A browser without a WebP encoder hands back a PNG instead.
    if (blob.type !== "image/webp") {
      blob = await canvas.convertToBlob({ type: "image/jpeg", quality: PHOTO_QUALITY });
    }
    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${file.name.replace(FILE_EXTENSION, "")}.${extension}`, {
      type: blob.type,
    });
  } catch {
    return null;
  }
}

export async function savePhotoBlob(blob: Blob): Promise<string> {
  const photoId = createId();

  if (!hasIndexedDb()) {
    // Session-only fallback; reconcilePhotos (repository.ts) drops the dangling id on the
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
