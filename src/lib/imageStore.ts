const DB_NAME = 'fasted-images';
const STORE_NAME = 'blobs';
const DB_VERSION = 1;

export const GUEST_IMAGE_SCOPE = 'guest';

export type ImageRecord = {
  key: string;
  id: string;
  scope: string;
  blob: Blob;
  mimeType: string;
  synced: boolean;
};

export function imageScopeKey(userId: string | null): string {
  return userId ?? GUEST_IMAGE_SCOPE;
}

function recordKey(scope: string, id: string): string {
  return `${scope}:${id}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Failed to open image store.'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('scope', 'scope', { unique: false });
      }
    };
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted.'));
  });
}

export async function putImage(
  scope: string,
  id: string,
  blob: Blob,
  options?: { synced?: boolean },
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const record: ImageRecord = {
    key: recordKey(scope, id),
    id,
    scope,
    blob,
    mimeType: blob.type || 'image/jpeg',
    synced: options?.synced ?? false,
  };
  store.put(record);
  await transactionDone(tx);
  db.close();
}

export async function getImage(scope: string, id: string): Promise<ImageRecord | null> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const record = await requestToPromise(store.get(recordKey(scope, id)));
  await transactionDone(tx);
  db.close();
  return (record as ImageRecord | undefined) ?? null;
}

export async function deleteImages(scope: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const id of ids) {
    store.delete(recordKey(scope, id));
  }
  await transactionDone(tx);
  db.close();
}

export async function listUnsynced(scope: string): Promise<ImageRecord[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('scope');
  const records = (await requestToPromise(index.getAll(scope))) as ImageRecord[];
  await transactionDone(tx);
  db.close();
  return records.filter((record) => !record.synced);
}

export async function markSynced(scope: string, id: string): Promise<void> {
  const existing = await getImage(scope, id);
  if (!existing) return;
  await putImage(scope, id, existing.blob, { synced: true });
}

export async function copyScope(fromScope: string, toScope: string): Promise<void> {
  if (fromScope === toScope) return;
  const db = await openDb();
  const readTx = db.transaction(STORE_NAME, 'readonly');
  const readStore = readTx.objectStore(STORE_NAME);
  const index = readStore.index('scope');
  const records = (await requestToPromise(index.getAll(fromScope))) as ImageRecord[];
  await transactionDone(readTx);

  if (records.length === 0) {
    db.close();
    return;
  }

  const writeTx = db.transaction(STORE_NAME, 'readwrite');
  const writeStore = writeTx.objectStore(STORE_NAME);
  for (const record of records) {
    writeStore.put({
      ...record,
      key: recordKey(toScope, record.id),
      scope: toScope,
      synced: false,
    });
  }
  await transactionDone(writeTx);
  db.close();
}

export async function clearScope(scope: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('scope');
  const records = (await requestToPromise(index.getAll(scope))) as ImageRecord[];
  for (const record of records) {
    store.delete(record.key);
  }
  await transactionDone(tx);
  db.close();
}

export function isDataUrl(value: string): boolean {
  return value.startsWith('data:');
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not encode image.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not encode image.'));
    reader.readAsDataURL(blob);
  });
}

/** Object-URL cache for resolved meal images (display only). */
const urlCache = new Map<string, string>();

function urlCacheKey(scope: string, id: string): string {
  return `${scope}:${id}`;
}

export function getCachedMealImageUrl(scope: string, id: string): string | undefined {
  return urlCache.get(urlCacheKey(scope, id));
}

export function setCachedMealImageUrl(scope: string, id: string, url: string): void {
  urlCache.set(urlCacheKey(scope, id), url);
}

export function invalidateMealImageSrcs(scope: string, ids: string[]): void {
  for (const id of ids) {
    const key = urlCacheKey(scope, id);
    const url = urlCache.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      urlCache.delete(key);
    }
  }
}
