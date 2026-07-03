import { useEffect, useState } from 'preact/hooks';

import { loadPhotoBlob } from '@/lib/photos';

export function usePhotoUrl(photoId?: string, photoFile?: File | null) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    let objectUrl: string | null = null;

    async function resolvePhotoUrl() {
      if (photoFile) {
        objectUrl = URL.createObjectURL(photoFile);

        if (isActive) {
          setPhotoUrl(objectUrl);
        }

        return;
      }

      if (!photoId) {
        if (isActive) {
          setPhotoUrl(null);
        }
        return;
      }

      const blob = await loadPhotoBlob(photoId);
      objectUrl = blob ? URL.createObjectURL(blob) : null;

      if (isActive) {
        setPhotoUrl(objectUrl);
      } else if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }

    void resolvePhotoUrl();

    return () => {
      isActive = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photoFile, photoId]);

  return photoUrl;
}
