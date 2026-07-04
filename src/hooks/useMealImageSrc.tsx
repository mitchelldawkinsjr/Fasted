import { useEffect, useState } from 'react';
import {
  getCachedMealImageUrl,
  imageScopeKey,
  isDataUrl,
  setCachedMealImageUrl,
} from '../lib/imageStore';
import { resolveMealImageBlob } from '../lib/mealImageSync';
import { getStorageScope } from '../lib/storage';

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

type MealImageThumbProps = {
  imageId: string;
  alt: string;
  className?: string;
};

/** Renders a meal image from an IDB/Storage image ID (or legacy data URL). */
export function MealImageThumb({ imageId, alt, className }: MealImageThumbProps) {
  const src = useMealImageSrc(imageId);
  if (!src) {
    return <div className={className} aria-hidden="true" />;
  }

  return <img src={src} alt={alt} className={className} />;
}
