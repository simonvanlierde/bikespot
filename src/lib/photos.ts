const PHOTO_DB_NAME = 'bikespot-photos';
const PHOTO_STORE_NAME = 'photos';

const memoryPhotoStore = new Map<string, Blob>();

export async function savePhotoBlob(blob: Blob): Promise<string> {
  const photoId = crypto.randomUUID();

  if (!hasIndexedDb()) {
    memoryPhotoStore.set(photoId, blob);
    return photoId;
  }

  const database = await openPhotoDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PHOTO_STORE_NAME);
    const request = store.put(blob, photoId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Could not save photo'));
  });

  return photoId;
}

export async function loadPhotoBlob(photoId: string): Promise<Blob | null> {
  if (!hasIndexedDb()) {
    return memoryPhotoStore.get(photoId) ?? null;
  }

  const database = await openPhotoDb();

  return new Promise<Blob | null>((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE_NAME, 'readonly');
    const store = transaction.objectStore(PHOTO_STORE_NAME);
    const request = store.get(photoId);

    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Could not load photo'));
  });
}

export async function deletePhotoBlob(photoId: string): Promise<void> {
  memoryPhotoStore.delete(photoId);

  if (!hasIndexedDb()) {
    return;
  }

  const database = await openPhotoDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PHOTO_STORE_NAME);
    const request = store.delete(photoId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Could not delete photo'));
  });
}

export async function clearPhotoBlobs(): Promise<void> {
  memoryPhotoStore.clear();

  if (!hasIndexedDb()) {
    return;
  }

  const database = await openPhotoDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(PHOTO_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(PHOTO_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Could not clear photo store'));
  });
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PHOTO_DB_NAME, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        request.result.createObjectStore(PHOTO_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open photo database'));
  });
}
