import type { UserProgress } from '../types';
import { formatAuthError, isNetworkError, withNetworkRetry } from './authErrors';
import { copyScope, GUEST_IMAGE_SCOPE, imageScopeKey } from './imageStore';
import { uploadPendingImages } from './mealImageSync';
import { messages } from './messages';
import {
  ensureMealImageMigration,
  getProgress,
  migrateLegacyStorage,
  persistFromCloud,
  resetProgress,
  switchStorageScope,
} from './storage';
import { MEAL_IMAGES_BUCKET } from './mealImageSync';
import {
  getSupabase,
  isSyncConfigured,
  PROGRESS_TABLE,
} from './supabase';
import { reportError } from './telemetry';

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

/** Survives full-page OAuth redirects (in-memory alone does not). */
const GUEST_MIGRATION_KEY = 'fasted-guest-migration';

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
    await ensureMealImageMigration();
    await uploadPendingImages(userId);

    const progress = getProgress();
    const updatedAt = progress.updatedAt ?? data.updatedAt ?? new Date().toISOString();
    const { error } = await getSupabase()
      .from(PROGRESS_TABLE)
      .upsert(
        {
          user_id: userId,
          data: progress,
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
    reportError(err, { source: 'pushProgressToCloud' });
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
  try {
    sessionStorage.removeItem(GUEST_MIGRATION_KEY);
  } catch {
    /* ignore */
  }
}

function rememberGuestMigration(guestFallback?: UserProgress): void {
  if (!guestFallback || !hasLocalProgress(guestFallback)) return;
  pendingGuestMigration = guestFallback;
  try {
    sessionStorage.setItem(GUEST_MIGRATION_KEY, JSON.stringify(guestFallback));
  } catch {
    /* quota / private mode — in-memory still used for password auth */
  }
}

function loadGuestMigration(): UserProgress | undefined {
  if (pendingGuestMigration && hasLocalProgress(pendingGuestMigration)) {
    return pendingGuestMigration;
  }
  try {
    const raw = sessionStorage.getItem(GUEST_MIGRATION_KEY);
    if (!raw) return undefined;
    const parsed = normalizeProgress(JSON.parse(raw) as unknown);
    if (parsed && hasLocalProgress(parsed)) {
      pendingGuestMigration = parsed;
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/** Merge guest journals/check-ins/images into an account copy without dropping either side. */
export function mergeUserProgress(account: UserProgress, guest: UserProgress): UserProgress {
  const journals = new Map(account.journalEntries.map((e) => [e.id, e]));
  for (const entry of guest.journalEntries) {
    const existing = journals.get(entry.id);
    if (!existing || (entry.updatedAt ?? '') >= (existing.updatedAt ?? '')) {
      journals.set(entry.id, entry);
    }
  }

  const checkIns = new Map(account.checkIns.map((c) => [c.date, c]));
  for (const checkIn of guest.checkIns) {
    const existing = checkIns.get(checkIn.date);
    if (!existing || (checkIn.completedAt ?? '') >= (existing.completedAt ?? '')) {
      checkIns.set(checkIn.date, checkIn);
    }
  }

  const mealImages = { ...guest.mealImages, ...account.mealImages };
  for (const [entryId, sections] of Object.entries(guest.mealImages)) {
    if (!mealImages[entryId]) {
      mealImages[entryId] = sections;
      continue;
    }
    mealImages[entryId] = { ...sections, ...mealImages[entryId] };
  }

  const badges = new Map(account.badges.map((b) => [b.id, b]));
  for (const badge of guest.badges) {
    const existing = badges.get(badge.id);
    if (!existing || (badge.earnedAt && !existing.earnedAt)) {
      badges.set(badge.id, badge);
    }
  }

  const journeys = new Map(account.journeys.map((j) => [j.id, j]));
  for (const journey of guest.journeys) {
    if (!journeys.has(journey.id)) journeys.set(journey.id, journey);
  }

  const groupCheckIns = { ...(guest.groupCheckIns ?? {}) };
  for (const [groupId, records] of Object.entries(account.groupCheckIns ?? {})) {
    const byDate = new Map((groupCheckIns[groupId] ?? []).map((r) => [r.date, r]));
    for (const record of records) {
      byDate.set(record.date, record);
    }
    groupCheckIns[groupId] = Array.from(byDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  const checkInList = Array.from(checkIns.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    ...account,
    checkIns: checkInList,
    checkInStreak: account.checkInStreak,
    journalEntries: Array.from(journals.values()).sort((a, b) => b.date.localeCompare(a.date)),
    mealImages,
    badges: Array.from(badges.values()),
    journeys: Array.from(journeys.values()),
    groupCheckIns,
    updatedAt: new Date().toISOString(),
  };
}

async function incorporateGuest(
  userId: string | null,
  account: UserProgress,
  guest: UserProgress | undefined,
): Promise<UserProgress> {
  if (!guest || !hasLocalProgress(guest)) return account;
  if (userId) {
    await copyScope(GUEST_IMAGE_SCOPE, imageScopeKey(userId));
  }
  return mergeUserProgress(account, guest);
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

  const guestFallback = options?.guestFallback ?? loadGuestMigration();

  try {
    const local = getProgress();
    const remote = await pullProgressFromCloud();
    const userId = await getCurrentUserId();

    if (!remote) {
      if (hasLocalProgress(local)) {
        const merged = await incorporateGuest(userId, local, guestFallback);
        if (merged !== local) persistFromCloud(merged);
        await ensureMealImageMigration();
        await pushProgressToCloud(getProgress());
        clearPendingGuestMigration();
        return;
      }
      if (guestFallback && hasLocalProgress(guestFallback)) {
        if (userId) {
          await copyScope(GUEST_IMAGE_SCOPE, imageScopeKey(userId));
        }
        persistFromCloud(guestFallback);
        await ensureMealImageMigration();
        await pushProgressToCloud(getProgress());
        clearPendingGuestMigration();
        return;
      }
      setStatus({ state: 'idle', error: null });
      return;
    }

    if (!hasLocalProgress(local)) {
      const merged = await incorporateGuest(userId, remote, guestFallback);
      persistFromCloud(merged);
      await ensureMealImageMigration();
      if (guestFallback && hasLocalProgress(guestFallback)) {
        await pushProgressToCloud(getProgress());
      }
      clearPendingGuestMigration();
      setStatus({
        state: 'synced',
        lastSyncedAt: new Date().toISOString(),
        error: null,
      });
      return;
    }

    if (progressTimestamp(remote) >= progressTimestamp(local)) {
      const merged = await incorporateGuest(userId, remote, guestFallback);
      persistFromCloud(merged);
      await ensureMealImageMigration();
      if (guestFallback && hasLocalProgress(guestFallback)) {
        await pushProgressToCloud(getProgress());
      }
    } else {
      const merged = await incorporateGuest(userId, local, guestFallback);
      if (merged !== local) persistFromCloud(merged);
      await ensureMealImageMigration();
      await pushProgressToCloud(getProgress());
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
    reportError(err, { source: 'reconcileWithCloud' });
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
  await reconcileWithCloud({ guestFallback: loadGuestMigration() });
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
  attachAuthScopeListener();

  if (!isSyncConfigured()) {
    switchStorageScope(null);
    void ensureMealImageMigration();
    return;
  }

  void (async () => {
    const { data } = await getSupabase().auth.getSession();

    if (data.session?.user?.id) {
      switchStorageScope(data.session.user.id);
      await ensureMealImageMigration();
      if (navigator.onLine) {
        void reconcileWithCloud({ guestFallback: loadGuestMigration() }).catch(() => {
          /* status updated in reconcileWithCloud */
        });
      } else {
        setStatus({ state: 'offline', error: null });
      }
      return;
    }

    switchStorageScope(null);
    await ensureMealImageMigration();
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

/** Snapshot guest progress after migrating meal images, as a deep clone (not a live cache ref). */
async function snapshotGuestProgress(): Promise<UserProgress | undefined> {
  await ensureMealImageMigration();
  const progress = getProgress();
  if (!hasLocalProgress(progress)) return undefined;
  return structuredClone(progress);
}

async function completeAuthOrWarn(userId: string, guestFallback?: UserProgress): Promise<AuthResult> {
  rememberGuestMigration(guestFallback);
  switchStorageScope(userId);

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
  const guestFallback = await snapshotGuestProgress();

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

  const guestFallback = await snapshotGuestProgress();

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
  rememberGuestMigration(await snapshotGuestProgress());

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

export async function signOut(options?: { skipFlush?: boolean }): Promise<void> {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  // Flush pending edits before leaving the signed-in storage scope.
  if (!options?.skipFlush && navigator.onLine && (await isLoggedIn())) {
    try {
      await pushProgressToCloud(getProgress());
    } catch {
      /* best-effort — do not block sign-out */
    }
  }

  switchStorageScope(null);
  if (isSyncConfigured()) {
    await getSupabase().auth.signOut();
  }
  setStatus({ state: 'idle', lastSyncedAt: null, error: null });
}

/**
 * Delete cloud progress + meal images for the signed-in user, clear local data,
 * and sign out. Auth user row removal requires a server-side admin action.
 */
export async function deleteAccountData(): Promise<void> {
  const userId = await getCurrentUserId();
  if (userId && isSyncConfigured()) {
    const client = getSupabase();
    const { error: progressError } = await client
      .from(PROGRESS_TABLE)
      .delete()
      .eq('user_id', userId);
    if (progressError) throw progressError;

    try {
      const { data: files } = await client.storage.from(MEAL_IMAGES_BUCKET).list(userId);
      if (files && files.length > 0) {
        await client.storage
          .from(MEAL_IMAGES_BUCKET)
          .remove(files.map((file) => `${userId}/${file.name}`));
      }
    } catch (err) {
      reportError(err, { source: 'deleteAccountData.mealImages' });
    }
  }

  resetProgress();
  await signOut({ skipFlush: true });
}
