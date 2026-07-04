const DB_NAME = 'fasted-calendar-meal-images';
const DB_VERSION = 1;
const STORE_NAME = 'images';

export type ImageScope = 'guest' | string;

export type StoredImageRecord = {
  id: string;
  scope: ImageScope;
  blob: Blob;
  mimeType: string;
  synced: boolean;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('scope', 'scope', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open meal image store.'));
  });

  return dbPromise;
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = fn(store);

        tx.oncomplete = () => {
          if (request instanceof IDBRequest) {
            resolve(request.result);
          } else {
            resolve(undefined);
          }
        };
        tx.onerror = () => reject(tx.error ?? new Error('Meal image store transaction failed.'));
      }),
  );
}

export function normalizeImageScope(scope: string | null): ImageScope {
  return scope ?? 'guest';
}

export async function putImage(
  id: string,
  blob: Blob,
  mimeType: string,
  options?: { scope?: ImageScope; synced?: boolean },
): Promise<void> {
  const scope = options?.scope ?? 'guest';
  const synced = options?.synced ?? false;
  await runTransaction('readwrite', (store) =>
    store.put({ id, scope, blob, mimeType, synced } satisfies StoredImageRecord),
  );
}

export async function getImage(id: string, scope?: ImageScope): Promise<Blob | null> {
  const record = (await runTransaction('readonly', (store) => store.get(id))) as
    | StoredImageRecord
    | undefined;
  if (!record) return null;
  if (scope && record.scope !== scope) return null;
  return record.blob;
}

export async function deleteImage(id: string): Promise<void> {
  await runTransaction('readwrite', (store) => store.delete(id));
}

export async function deleteImages(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  await openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const id of ids) {
          store.delete(id);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Could not delete meal images.'));
      }),
  );
}

export async function listImagesForScope(scope: ImageScope): Promise<StoredImageRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('scope');
    const request = index.getAll(scope);
    request.onsuccess = () => resolve((request.result as StoredImageRecord[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error('Could not list meal images.'));
  });
}

export async function listUnsynced(scope: ImageScope): Promise<StoredImageRecord[]> {
  const records = await listImagesForScope(scope);
  return records.filter((record) => !record.synced);
}

export async function markSynced(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    let pending = ids.length;

    for (const id of ids) {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const record = getRequest.result as StoredImageRecord | undefined;
        if (record) {
          store.put({ ...record, synced: true });
        }
        pending -= 1;
        if (pending === 0) {
          /* wait for tx.oncomplete */
        }
      };
      getRequest.onerror = () => reject(getRequest.error ?? new Error('Could not mark meal image synced.'));
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not mark meal images synced.'));
  });
}

export async function copyScope(fromScope: ImageScope, toScope: ImageScope): Promise<void> {
  const records = await listImagesForScope(fromScope);
  if (records.length === 0) return;

  await openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        for (const record of records) {
          store.put({
            ...record,
            scope: toScope,
            synced: false,
          });
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Could not copy meal image scope.'));
      }),
  );
}

export async function clearScope(scope: ImageScope): Promise<void> {
  const records = await listImagesForScope(scope);
  await deleteImages(records.map((record) => record.id));
}
