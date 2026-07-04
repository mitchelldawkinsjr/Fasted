import { ensureMealImageAvailable } from './mealImageSync';
import { isBase64DataUrl } from './mealImages';

const objectUrlCache = new Map<string, string>();

export async function resolveMealImageUrl(idOrLegacyDataUrl: string): Promise<string> {
  if (isBase64DataUrl(idOrLegacyDataUrl)) {
    return idOrLegacyDataUrl;
  }

  const cached = objectUrlCache.get(idOrLegacyDataUrl);
  if (cached) return cached;

  const blob = await ensureMealImageAvailable(idOrLegacyDataUrl);
  if (!blob) return '';

  const url = URL.createObjectURL(blob);
  objectUrlCache.set(idOrLegacyDataUrl, url);
  return url;
}

export async function resolveMealImageUrls(ids: readonly string[]): Promise<string[]> {
  return Promise.all(ids.map((id) => resolveMealImageUrl(id)));
}

export function revokeMealImageUrls(urls: readonly string[]): void {
  for (const url of urls) {
    if (!url.startsWith('data:')) {
      URL.revokeObjectURL(url);
    }
  }
}

export function clearMealImageUrlCache(): void {
  for (const url of objectUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  objectUrlCache.clear();
}
