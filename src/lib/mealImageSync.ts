import {
  deleteImages as deleteLocalImages,
  getImage,
  listUnsynced,
  markSynced,
  normalizeImageScope,
  putImage,
  type ImageScope,
} from './imageStore';
import { getStorageScope } from './storageScope';
import { getSupabase, isSyncConfigured, MEAL_IMAGES_BUCKET } from './supabase';

function storagePath(userId: string, imageId: string): string {
  return `${userId}/${imageId}.jpg`;
}

export async function uploadMealImage(userId: string, imageId: string, blob: Blob): Promise<void> {
  const { error } = await getSupabase()
    .storage.from(MEAL_IMAGES_BUCKET)
    .upload(storagePath(userId, imageId), blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;
}

export async function downloadMealImage(userId: string, imageId: string): Promise<Blob | null> {
  if (!isSyncConfigured()) return null;

  const { data, error } = await getSupabase()
    .storage.from(MEAL_IMAGES_BUCKET)
    .download(storagePath(userId, imageId));

  if (error || !data) return null;
  return data;
}

export async function deleteRemoteMealImages(userId: string, imageIds: readonly string[]): Promise<void> {
  if (!isSyncConfigured() || imageIds.length === 0) return;

  const paths = imageIds.map((id) => storagePath(userId, id));
  const { error } = await getSupabase().storage.from(MEAL_IMAGES_BUCKET).remove(paths);
  if (error) throw error;
}

export async function syncPendingMealImages(userId: string): Promise<void> {
  if (!isSyncConfigured() || !navigator.onLine) return;

  const scope = normalizeImageScope(userId);
  const pending = await listUnsynced(scope);

  const uploaded: string[] = [];
  for (const record of pending) {
    await uploadMealImage(userId, record.id, record.blob);
    uploaded.push(record.id);
  }

  if (uploaded.length > 0) {
    await markSynced(uploaded);
  }
}

export async function ensureMealImageAvailable(
  imageId: string,
  scope?: ImageScope,
): Promise<Blob | null> {
  const activeScope = scope ?? normalizeImageScope(getStorageScope());
  const local = await getImage(imageId, activeScope);
  if (local) return local;

  if (!isSyncConfigured() || activeScope === 'guest') return null;

  const downloaded = await downloadMealImage(activeScope, imageId);
  if (!downloaded) return null;

  await putImage(imageId, downloaded, 'image/jpeg', { scope: activeScope, synced: true });
  return downloaded;
}

export async function deleteMealImagesEverywhere(imageIds: readonly string[]): Promise<void> {
  if (imageIds.length === 0) return;

  await deleteLocalImages(imageIds);

  const scope = getStorageScope();
  if (scope && isSyncConfigured() && navigator.onLine) {
    try {
      await deleteRemoteMealImages(scope, imageIds);
    } catch {
      // Local delete succeeded; remote cleanup can retry on next sync.
    }
  }
}
