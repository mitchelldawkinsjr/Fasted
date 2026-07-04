const urlCache = new Map<string, string>();

function cacheKey(scope: string, id: string): string {
  return `${scope}:${id}`;
}

export function getCachedMealImageUrl(scope: string, id: string): string | undefined {
  return urlCache.get(cacheKey(scope, id));
}

export function setCachedMealImageUrl(scope: string, id: string, url: string): void {
  urlCache.set(cacheKey(scope, id), url);
}

export function invalidateMealImageSrcs(scope: string, ids: string[]): void {
  for (const id of ids) {
    const key = cacheKey(scope, id);
    const url = urlCache.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      urlCache.delete(key);
    }
  }
}
