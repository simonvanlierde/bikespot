import { useEffect, useState } from 'preact/hooks';

import { getPhotoUrl } from '@/lib/repository';

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

      objectUrl = await getPhotoUrl(photoId);

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
