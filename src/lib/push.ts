import { getSupabase, isSyncConfigured, PUSH_SUBSCRIPTIONS_TABLE } from './supabase';

export type PushSupport =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'not-configured' | 'insecure-context' };

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output.buffer;
}

export function getVapidPublicKey(): string {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() ?? '';
}

export function getPushSupport(): PushSupport {
  if (!isSyncConfigured() || !getVapidPublicKey()) {
    return { ok: false, reason: 'not-configured' };
  }
  if (typeof window === 'undefined' || !window.isSecureContext) {
    return { ok: false, reason: 'insecure-context' };
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { ok: false, reason: 'unsupported' };
  }
  return { ok: true };
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  const support = getPushSupport();
  if (!support.ok) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enablePushNotifications(): Promise<PushSubscription> {
  const support = getPushSupport();
  if (!support.ok) {
    throw new Error(
      support.reason === 'unsupported'
        ? 'Push notifications are not supported in this browser.'
        : support.reason === 'insecure-context'
          ? 'Push notifications require HTTPS (or localhost).'
          : 'Push notifications are not configured for this deployment.',
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey()),
    }));

  await upsertPushSubscription(subscription);
  return subscription;
}

export async function disablePushNotifications(): Promise<void> {
  const support = getPushSupport();
  if (!support.ok) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await deletePushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }
}

export async function syncPushSubscriptionIfNeeded(enabled: boolean): Promise<void> {
  if (!enabled) return;
  const support = getPushSupport();
  if (!support.ok) return;
  if (Notification.permission !== 'granted') return;

  const subscription = await getExistingPushSubscription();
  if (subscription) {
    await upsertPushSubscription(subscription);
  }
}

async function upsertPushSubscription(subscription: PushSubscription): Promise<void> {
  if (!isSyncConfigured()) return;

  const { data: auth } = await getSupabase().auth.getUser();
  const userId = auth.user?.id;
  if (!userId) {
    throw new Error('Sign in to enable push reminders.');
  }

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const authKey = json.keys?.auth;
  if (!endpoint || !p256dh || !authKey) {
    throw new Error('Push subscription is missing required keys.');
  }

  const { error } = await getSupabase().from(PUSH_SUBSCRIPTIONS_TABLE).upsert(
    {
      user_id: userId,
      endpoint,
      p256dh,
      auth: authKey,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,endpoint' },
  );

  if (error) throw error;
}

async function deletePushSubscription(endpoint: string): Promise<void> {
  if (!isSyncConfigured()) return;
  const { data: auth } = await getSupabase().auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;

  const { error } = await getSupabase()
    .from(PUSH_SUBSCRIPTIONS_TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) throw error;
}

export async function deleteAllPushSubscriptionsForCurrentUser(): Promise<void> {
  if (!isSyncConfigured()) return;
  const { data: auth } = await getSupabase().auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;

  const { error } = await getSupabase()
    .from(PUSH_SUBSCRIPTIONS_TABLE)
    .delete()
    .eq('user_id', userId);

  if (error) throw error;

  try {
    const subscription = await getExistingPushSubscription();
    if (subscription) await subscription.unsubscribe();
  } catch {
    /* best-effort local cleanup */
  }
}

export function isValidReminderTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
