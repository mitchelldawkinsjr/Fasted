import { useEffect, useMemo, useState } from 'react';
import { resolveMealImageUrls, revokeMealImageUrls } from '../lib/mealImageResolve';

export function useMealImageUrls(imageIds: readonly string[]): string[] {
  const key = useMemo(() => imageIds.join('\0'), [imageIds]);
  const [urls, setUrls] = useState<string[]>(() => imageIds.map(() => ''));

  useEffect(() => {
    let cancelled = false;
    let objectUrls: string[] = [];

    void resolveMealImageUrls(imageIds).then((resolved) => {
      if (cancelled) {
        revokeMealImageUrls(resolved);
        return;
      }
      objectUrls = resolved;
      setUrls(resolved);
    });

    return () => {
      cancelled = true;
      revokeMealImageUrls(objectUrls);
    };
  }, [key, imageIds]);

  return urls;
}
