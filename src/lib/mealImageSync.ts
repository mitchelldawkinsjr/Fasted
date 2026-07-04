import {
  getImage,
  imageScopeKey,
  putImage,
  listUnsynced,
  markSynced,
} from './imageStore';
import { getSupabase, isSyncConfigured } from './supabase';

export const MEAL_IMAGES_BUCKET = 'meal-images';

export function remoteImagePath(userId: string, id: string): string {
  return `${userId}/${id}.jpg`;
}

export async function uploadPendingImages(userId: string): Promise<void> {
  if (!isSyncConfigured()) return;

  const scope = imageScopeKey(userId);
  const pending = await listUnsynced(scope);
  if (pending.length === 0) return;

  const client = getSupabase();
  for (const record of pending) {
    const path = remoteImagePath(userId, record.id);
    const { error } = await client.storage.from(MEAL_IMAGES_BUCKET).upload(path, record.blob, {
      contentType: record.mimeType || 'image/jpeg',
      upsert: true,
    });
    if (error) throw error;
    await markSynced(scope, record.id);
  }
}

export async function downloadImage(userId: string, id: string): Promise<Blob | null> {
  if (!isSyncConfigured()) return null;

  const { data, error } = await getSupabase()
    .storage.from(MEAL_IMAGES_BUCKET)
    .download(remoteImagePath(userId, id));

  if (error || !data) return null;

  const scope = imageScopeKey(userId);
  await putImage(scope, id, data, { synced: true });
  return data;
}

export async function deleteRemoteImages(userId: string, ids: string[]): Promise<void> {
  if (!isSyncConfigured() || ids.length === 0) return;

  const paths = ids.map((id) => remoteImagePath(userId, id));
  const { error } = await getSupabase().storage.from(MEAL_IMAGES_BUCKET).remove(paths);
  if (error) throw error;
}

/** Resolve a meal image blob from IDB, downloading from Storage when signed in and missing locally. */
export async function resolveMealImageBlob(scope: string, id: string): Promise<Blob | null> {
  const local = await getImage(scope, id);
  if (local) return local.blob;

  if (scope === 'guest') return null;
  return downloadImage(scope, id);
}
