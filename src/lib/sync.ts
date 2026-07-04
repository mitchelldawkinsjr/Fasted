import type { UserProgress } from '../types';
import { formatAuthError, isNetworkError, withNetworkRetry } from './authErrors';
import { messages } from './messages';
import { copyScopeMealImages } from './mealImages';
import { syncPendingMealImages } from './mealImageSync';
import {
  ensureMealImagesMigrated,
  getProgress,
  migrateLegacyStorage,
  persistFromCloud,
  switchStorageScope,
} from './storage';
import {
  getSupabase,
  isSyncConfigured,
  PROGRESS_TABLE,
} from './supabase';

export type AuthResult = {
  syncWarning?: string;
};

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
let authListenerAttached = false;
let pendingGuestMigration: UserProgress | undefined;

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

export async function isLoggedIn(): Promise<boolean> {
  if (!isSyncConfigured()) return false;
  try {
    const { data } = await getSupabase().auth.getSession();
    return !!data.session?.user;
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

function progressTimestamp(progress: UserProgress): string {
  return progress.updatedAt ?? '';
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser();
  return data.user?.id ?? null;
}

async function findProgressRecord(userId: string): Promise<{ data: unknown; updated_at: string } | null> {
  const { data, error } = await getSupabase()
    .from(PROGRESS_TABLE)
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

export async function pushProgressToCloud(data: UserProgress): Promise<void> {
  if (!(await isLoggedIn())) return;

  const userId = await getCurrentUserId();
  if (!userId) return;

  if (!navigator.onLine) {
    setStatus({ state: 'offline', error: null });
    return;
  }

  setStatus({ state: 'syncing', error: null });

  try {
    const updatedAt = data.updatedAt ?? new Date().toISOString();
    await syncPendingMealImages(userId);
    const { error } = await getSupabase()
      .from(PROGRESS_TABLE)
      .upsert(
        {
          user_id: userId,
          data,
          updated_at: updatedAt,
        },
        { onConflict: 'user_id' },
      );

    if (error) throw error;

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
  if (!(await isLoggedIn())) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null;

  const record = await findProgressRecord(userId);
  if (!record) return null;
  return normalizeProgress(record.data);
}

function clearPendingGuestMigration(): void {
  pendingGuestMigration = undefined;
}

function rememberGuestMigration(guestFallback?: UserProgress): void {
  if (guestFallback && hasLocalProgress(guestFallback)) {
    pendingGuestMigration = guestFallback;
  }
}

/** Cloud-first reconcile: newer `updatedAt` wins; guest data seeds a new account once. */
export async function reconcileWithCloud(options?: {
  guestFallback?: UserProgress;
}): Promise<void> {
  if (!(await isLoggedIn())) return;

  if (!navigator.onLine) {
    setStatus({ state: 'offline', error: null });
    return;
  }

  setStatus({ state: 'syncing', error: null });

  const guestFallback = options?.guestFallback ?? pendingGuestMigration;

  try {
    const local = getProgress();
    const remote = await pullProgressFromCloud();

    if (!remote) {
      if (hasLocalProgress(local)) {
        await pushProgressToCloud(local);
        clearPendingGuestMigration();
        return;
      }
      if (guestFallback && hasLocalProgress(guestFallback)) {
        persistFromCloud(guestFallback);
        const userId = await getCurrentUserId();
        if (userId) {
          await copyScopeMealImages('guest', userId);
        }
        await pushProgressToCloud(getProgress());
        clearPendingGuestMigration();
        return;
      }
      setStatus({ state: 'idle', error: null });
      return;
    }

    if (!hasLocalProgress(local)) {
      persistFromCloud(remote);
      clearPendingGuestMigration();
      setStatus({
        state: 'synced',
        lastSyncedAt: new Date().toISOString(),
        error: null,
      });
      return;
    }

    if (progressTimestamp(remote) >= progressTimestamp(local)) {
      persistFromCloud(remote);
    } else {
      await pushProgressToCloud(local);
      clearPendingGuestMigration();
      return;
    }

    clearPendingGuestMigration();
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

export function scheduleCloudSync(): void {
  void isLoggedIn().then((loggedIn) => {
    if (!loggedIn) return;

    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncTimer = null;
      void pushProgressToCloud(getProgress()).catch(() => {
        /* status updated in pushProgressToCloud */
      });
    }, 1500);
  });
}

export async function syncNow(): Promise<void> {
  await reconcileWithCloud({ guestFallback: pendingGuestMigration });
}

function attachAuthScopeListener(): void {
  if (!isSyncConfigured() || authListenerAttached) return;

  const client = getSupabase();
  client.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.id) {
      switchStorageScope(session.user.id);
    } else {
      switchStorageScope(null);
    }
  });
  authListenerAttached = true;

  void client.auth.getSession().then(({ data }) => {
    if (data.session?.user?.id) {
      switchStorageScope(data.session.user.id);
    }
  });
}

/** Call once before the app renders — restores session scope and pulls cloud data. */
export function initAuthSync(): void {
  migrateLegacyStorage();
  void ensureMealImagesMigrated();
  attachAuthScopeListener();

  if (!isSyncConfigured()) {
    switchStorageScope(null);
    return;
  }

  void (async () => {
    const { data } = await getSupabase().auth.getSession();

    if (data.session?.user?.id) {
      switchStorageScope(data.session.user.id);
      if (navigator.onLine) {
        void reconcileWithCloud().catch(() => {
          /* status updated in reconcileWithCloud */
        });
      } else {
        setStatus({ state: 'offline', error: null });
      }
      return;
    }

    switchStorageScope(null);
  })();
}

async function authWithRetry<T extends { error: unknown }>(call: () => Promise<T>): Promise<T> {
  return withNetworkRetry(async () => {
    const result = await call();
    if (result.error && isNetworkError(result.error)) {
      throw result.error;
    }
    return result;
  });
}

async function completeAuthOrWarn(userId: string, guestFallback?: UserProgress): Promise<AuthResult> {
  rememberGuestMigration(guestFallback);
  switchStorageScope(userId);

  if (guestFallback && hasLocalProgress(guestFallback)) {
    await copyScopeMealImages('guest', userId);
  }

  try {
    await reconcileWithCloud({ guestFallback: pendingGuestMigration });
    clearPendingGuestMigration();
    return {};
  } catch (syncErr) {
    const syncWarning = formatAuthError(syncErr, messages.sync.failed);
    setStatus({ state: 'error', error: syncWarning });
    return { syncWarning: messages.sync.signedInSyncPending };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const guestFallback = hasLocalProgress(getProgress()) ? getProgress() : undefined;

  const { data, error } = await authWithRetry(() =>
    getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    }),
  );
  if (error) throw new Error(formatAuthError(error));
  const userId = data.user?.id;
  if (!userId) throw new Error(messages.sync.authFailed);

  return completeAuthOrWarn(userId, guestFallback);
}

export async function signUp(
  email: string,
  password: string,
  passwordConfirm: string,
  name: string,
): Promise<AuthResult> {
  if (password !== passwordConfirm) {
    throw new Error('Passwords do not match');
  }

  const guestFallback = hasLocalProgress(getProgress()) ? getProgress() : undefined;

  const { data, error } = await authWithRetry(() =>
    getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
      },
    }),
  );
  if (error) throw new Error(formatAuthError(error));
  const userId = data.user?.id;
  if (!userId) throw new Error('Account created but sign in failed');

  return completeAuthOrWarn(userId, guestFallback);
}

export async function updateUserProfile(name: string): Promise<void> {
  const { error } = await getSupabase().auth.updateUser({
    data: { full_name: name.trim() },
  });
  if (error) throw error;
}

export async function signInWithOAuth(provider: 'google' | 'facebook'): Promise<void> {
  rememberGuestMigration(hasLocalProgress(getProgress()) ? getProgress() : undefined);

  const { error } = await authWithRetry(() =>
    getSupabase().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    }),
  );
  if (error) throw new Error(formatAuthError(error));
  // Session is picked up automatically by onAuthStateChange in useAuth after redirect
}

export async function signOut(): Promise<void> {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  switchStorageScope(null);
  if (isSyncConfigured()) {
    await getSupabase().auth.signOut();
  }
  setStatus({ state: 'idle', lastSyncedAt: null, error: null });
}
