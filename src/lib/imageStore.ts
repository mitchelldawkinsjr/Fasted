const DB_NAME = 'fasted-calendar-meal-images';
const DB_VERSION = 2;
const STORE_NAME = 'images';

export type ImageScope = 'guest' | string;

export type StoredImageRecord = {
  id: string;
  scope: ImageScope;
  blob: Blob;
  synced: boolean;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction;
      if (event.oldVersion < 1) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('scope', 'scope', { unique: false });
      }
      if (event.oldVersion > 0 && event.oldVersion < 2 && tx) {
        const store = tx.objectStore(STORE_NAME);
        if (store.indexNames.contains('synced')) {
          store.deleteIndex('synced');
        }
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

function runWrite(fn: (store: IDBObjectStore) => void): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        fn(tx.objectStore(STORE_NAME));
        tx.oncomplete = () => resolve();
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
  options?: { scope?: ImageScope; synced?: boolean },
): Promise<void> {
  const scope = options?.scope ?? 'guest';
  const synced = options?.synced ?? false;
  await runTransaction('readwrite', (store) =>
    store.put({ id, scope, blob, synced } satisfies StoredImageRecord),
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

export async function deleteImages(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  await runWrite((store) => {
    for (const id of ids) {
      store.delete(id);
    }
  });
}

export async function listImagesForScope(scope: ImageScope): Promise<StoredImageRecord[]> {
  const result = await runTransaction('readonly', (store) => store.index('scope').getAll(scope));
  return (result as StoredImageRecord[]) ?? [];
}

export async function listUnsynced(scope: ImageScope): Promise<StoredImageRecord[]> {
  const records = await listImagesForScope(scope);
  return records.filter((record) => !record.synced);
}

export async function markSynced(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;

  await runWrite((store) => {
    for (const id of ids) {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const record = getRequest.result as StoredImageRecord | undefined;
        if (record) {
          store.put({ ...record, synced: true });
        }
      };
    }
  });
}

export async function copyScope(fromScope: ImageScope, toScope: ImageScope): Promise<void> {
  const records = await listImagesForScope(fromScope);
  if (records.length === 0) return;

  await runWrite((store) => {
    for (const record of records) {
      store.put({
        ...record,
        scope: toScope,
        synced: false,
      });
    }
  });
}

export async function clearScope(scope: ImageScope): Promise<void> {
  const records = await listImagesForScope(scope);
  await deleteImages(records.map((record) => record.id));
}
