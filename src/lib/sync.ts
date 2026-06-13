import type { UserProgress } from '../types';
import { getProgress, persistFromCloud } from './storage';
import {
  getPocketBase,
  isSyncConfigured,
  PROGRESS_COLLECTION,
  type ProgressRecord,
} from './pocketbase';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export type SyncStatus = {
  state: SyncState;
  lastSyncedAt: string | null;
  error: string | null;
};

const listeners = new Set<() => void>();

let status: SyncStatus = {
  state: 'idle',
  lastSyncedAt: null,
  error: null,
};

let syncTimer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  listeners.forEach((fn) => fn());
}

function setStatus(partial: Partial<SyncStatus>) {
  status = { ...status, ...partial };
  notify();
}

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function isLoggedIn(): boolean {
  if (!isSyncConfigured()) return false;
  try {
    return getPocketBase().authStore.isValid;
  } catch {
    return false;
  }
}

export function hasLocalProgress(progress: UserProgress): boolean {
  return (
    progress.checkIns.length > 0 ||
    progress.journalEntries.length > 0 ||
    progress.badges.some((badge) => Boolean(badge.earnedAt))
  );
}

function normalizeProgress(data: unknown): UserProgress | null {
  if (!data || typeof data !== 'object') return null;
  const candidate = data as UserProgress;
  if (!Array.isArray(candidate.checkIns) || !Array.isArray(candidate.journalEntries)) {
    return null;
  }
  return candidate;
}

async function findProgressRecord(userId: string): Promise<ProgressRecord | null> {
  const pb = getPocketBase();
  try {
    return await pb.collection(PROGRESS_COLLECTION).getFirstListItem<ProgressRecord>(
      `user = "${userId}"`,
    );
  } catch {
    return null;
  }
}

export async function pushProgressToCloud(data: UserProgress): Promise<void> {
  if (!isLoggedIn()) return;

  const pb = getPocketBase();
  const userId = pb.authStore.record?.id;
  if (!userId) return;

  if (!navigator.onLine) {
    setStatus({ state: 'offline', error: null });
    return;
  }

  setStatus({ state: 'syncing', error: null });

  try {
    const existing = await findProgressRecord(userId);
    const payload = { user: userId, data };

    if (existing) {
      await pb.collection(PROGRESS_COLLECTION).update(existing.id, payload);
    } else {
      await pb.collection(PROGRESS_COLLECTION).create(payload);
    }

    setStatus({
      state: 'synced',
      lastSyncedAt: new Date().toISOString(),
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    setStatus({ state: 'error', error: message });
    throw err;
  }
}

export async function pullProgressFromCloud(): Promise<UserProgress | null> {
  if (!isLoggedIn()) return null;

  const pb = getPocketBase();
  const userId = pb.authStore.record?.id;
  if (!userId) return null;

  const record = await findProgressRecord(userId);
  if (!record) return null;
  return normalizeProgress(record.data);
}

export async function syncOnLogin(): Promise<void> {
  const local = getProgress();

  if (hasLocalProgress(local)) {
    await pushProgressToCloud(local);
    return;
  }

  const remote = await pullProgressFromCloud();
  if (remote) {
    persistFromCloud(remote);
    setStatus({
      state: 'synced',
      lastSyncedAt: new Date().toISOString(),
      error: null,
    });
  } else {
    setStatus({ state: 'idle', error: null });
  }
}

export function scheduleCloudSync(): void {
  if (!isLoggedIn()) return;

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void pushProgressToCloud(getProgress()).catch(() => {
      /* status updated in pushProgressToCloud */
    });
  }, 1500);
}

export async function syncNow(): Promise<void> {
  await pushProgressToCloud(getProgress());
}

export async function signIn(email: string, password: string): Promise<void> {
  const pb = getPocketBase();
  await pb.collection('users').authWithPassword(email, password);
  await syncOnLogin();
}

export async function signUp(
  email: string,
  password: string,
  passwordConfirm: string,
  name: string,
): Promise<void> {
  const pb = getPocketBase();
  await pb.collection('users').create({
    email,
    password,
    passwordConfirm,
    name: name.trim(),
    emailVisibility: true,
  });
  await pb.collection('users').authWithPassword(email, password);
  await syncOnLogin();
}

export async function updateUserProfile(name: string): Promise<void> {
  const pb = getPocketBase();
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error('You must be signed in to update your profile.');

  const updated = await pb.collection('users').update(userId, {
    name: name.trim(),
  });
  pb.authStore.save(pb.authStore.token, updated);
}

export function signOut(): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  if (isSyncConfigured()) {
    getPocketBase().authStore.clear();
  }
  setStatus({ state: 'idle', lastSyncedAt: null, error: null });
}
