import { useEffect, useMemo, useState } from 'react';
import { ensureMealImageAvailable } from '../lib/mealImageSync';
import { isBase64DataUrl } from '../lib/mealImages';

async function resolveMealImageUrl(idOrLegacyDataUrl: string): Promise<string> {
  if (isBase64DataUrl(idOrLegacyDataUrl)) {
    return idOrLegacyDataUrl;
  }

  const blob = await ensureMealImageAvailable(idOrLegacyDataUrl);
  if (!blob) return '';

  return URL.createObjectURL(blob);
}

function revokeMealImageUrls(urls: readonly string[]): void {
  for (const url of urls) {
    if (url && !url.startsWith('data:')) {
      URL.revokeObjectURL(url);
    }
  }
}

export function useMealImageUrls(imageIds: readonly string[]): { urls: string[]; ready: boolean } {
  const key = useMemo(() => imageIds.join('\0'), [imageIds]);
  const [urls, setUrls] = useState<string[]>(() => imageIds.map(() => ''));
  const [ready, setReady] = useState(imageIds.length === 0);

  useEffect(() => {
    let cancelled = false;
    let objectUrls: string[] = [];

    if (imageIds.length === 0) {
      setUrls([]);
      setReady(true);
      return;
    }

    setReady(false);

    void Promise.all(imageIds.map((id) => resolveMealImageUrl(id))).then((resolved) => {
      if (cancelled) {
        revokeMealImageUrls(resolved);
        return;
      }
      objectUrls = resolved;
      setUrls(resolved);
      setReady(true);
    });

    return () => {
      cancelled = true;
      revokeMealImageUrls(objectUrls);
    };
  }, [key, imageIds]);

  return { urls, ready };
}
