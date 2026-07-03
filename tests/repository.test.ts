import { beforeEach, describe, expect, it } from 'vitest';

import { defaultAppData } from '../src/lib/defaults';
import { clearPhotoBlobs, savePhotoBlob } from '../src/lib/photos';
import { APP_DATA_STORAGE_KEY, loadAppData, saveAppData } from '../src/lib/repository';

describe('app data repository', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await clearPhotoBlobs();
  });

  it('hydrates the default app data when nothing has been stored yet', async () => {
    await expect(loadAppData()).resolves.toEqual(defaultAppData);
  });

  it('stores photo blobs outside localStorage and can read them back by photo id', async () => {
    const photoId = await savePhotoBlob(
      new File(['bike-photo'], 'bike.png', { type: 'image/png' }),
    );

    const nextData = {
      ...defaultAppData,
      current:
        defaultAppData.current && defaultAppData.current.mode === 'station'
          ? {
              ...defaultAppData.current,
              photoId,
            }
          : defaultAppData.current,
    };

    await saveAppData(nextData);

    const persisted = window.localStorage.getItem(APP_DATA_STORAGE_KEY);

    expect(persisted).toContain(photoId);
    expect(persisted).not.toContain('bike-photo');
    expect(JSON.parse(persisted ?? '{}')).toMatchObject({
      current: {
        photoId,
      },
    });

    const hydrated = await loadAppData();

    expect(hydrated.current).toMatchObject({
      photoId,
    });
  });

  it('round-trips valid coordinates and drops invalid ones on load', async () => {
    const base = defaultAppData.current;

    if (base?.mode !== 'station') {
      throw new Error('expected a station current record in defaults');
    }

    window.localStorage.setItem(
      APP_DATA_STORAGE_KEY,
      JSON.stringify({
        ...defaultAppData,
        current: { ...base, coords: { lat: 52.379189, lng: 4.899431, accuracy: 12 } },
        recent: [
          { ...defaultAppData.recent[0], coords: { lat: 999, lng: 4.9 } },
          { ...defaultAppData.recent[0], id: 'no-coords', coords: undefined },
        ],
      }),
    );

    const hydrated = await loadAppData();

    expect(hydrated.current?.coords).toEqual({ lat: 52.379189, lng: 4.899431, accuracy: 12 });
    // Out-of-range latitude is rejected, and records without coords still load.
    expect(hydrated.recent[0]?.coords).toBeUndefined();
    expect(hydrated.recent[1]?.coords).toBeUndefined();
  });

  it('starts fresh when legacy versioned state is found', async () => {
    window.localStorage.setItem(
      APP_DATA_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        state: {
          ...defaultAppData,
          current: {
            ...defaultAppData.current,
            photoDataUrl: 'data:image/png;base64,bGVnYWN5LXBob3Rv',
          },
        },
      }),
    );

    await expect(loadAppData()).resolves.toEqual(defaultAppData);
  });
});
