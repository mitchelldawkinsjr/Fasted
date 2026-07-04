import { useEffect, useState } from 'react';
import { getStorageScope } from '../lib/storage';
import { imageScopeKey, isDataUrl } from '../lib/imageStore';
import {
  getCachedMealImageUrl,
  setCachedMealImageUrl,
} from '../lib/mealImageUrls';
import { resolveMealImageBlob } from '../lib/mealImageSync';

async function resolveSrc(scope: string, imageId: string): Promise<string | undefined> {
  if (isDataUrl(imageId)) return imageId;

  const cached = getCachedMealImageUrl(scope, imageId);
  if (cached) return cached;

  const blob = await resolveMealImageBlob(scope, imageId);
  if (!blob) return undefined;

  const url = URL.createObjectURL(blob);
  setCachedMealImageUrl(scope, imageId, url);
  return url;
}

/** Resolve a meal image ID (or legacy data URL) to an object URL for display. */
export function useMealImageSrc(imageId: string | undefined): string | undefined {
  const scope = imageScopeKey(getStorageScope());
  const [src, setSrc] = useState<string | undefined>(() => {
    if (!imageId) return undefined;
    if (isDataUrl(imageId)) return imageId;
    return getCachedMealImageUrl(scope, imageId);
  });

  useEffect(() => {
    if (!imageId) {
      setSrc(undefined);
      return;
    }

    let cancelled = false;

    void resolveSrc(scope, imageId).then((next) => {
      if (!cancelled) setSrc(next);
    });

    return () => {
      cancelled = true;
    };
  }, [imageId, scope]);

  return src;
}

/** Resolve multiple meal image IDs to display URLs (stable order). */
export function useMealImageSrcs(imageIds: string[]): (string | undefined)[] {
  const scope = imageScopeKey(getStorageScope());
  const idsKey = imageIds.join('|');
  const [srcs, setSrcs] = useState<(string | undefined)[]>(() =>
    imageIds.map((id) => {
      if (isDataUrl(id)) return id;
      return getCachedMealImageUrl(scope, id);
    }),
  );

  useEffect(() => {
    let cancelled = false;
    const ids = idsKey ? idsKey.split('|') : [];

    void Promise.all(ids.map((id) => resolveSrc(scope, id))).then((next) => {
      if (!cancelled) setSrcs(next);
    });

    return () => {
      cancelled = true;
    };
  }, [idsKey, scope]);

  return srcs;
}
