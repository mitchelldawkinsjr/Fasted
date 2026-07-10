#!/usr/bin/env node
/**
 * Cron job: send morning / evening Web Push reminders.
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT          (mailto: or https: contact)
 *
 * Optional:
 *   DRY_RUN=1
 *
 * Schedule every 15 minutes, e.g.:
 *   every-15-min cron: cd /opt/apps/fasted-calendar && node scripts/send-push-reminders.mjs >> /var/log/fasted-push.log 2>&1
 */

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { decideReminder } from '../src/lib/pushReminders.shared.js';

const DEFAULT_REMINDER_TIME = '07:00';

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT = 'mailto:support@fasted.app',
  DRY_RUN,
} = process.env;

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
}

requireEnv('SUPABASE_URL', SUPABASE_URL);
requireEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);
requireEnv('VAPID_PUBLIC_KEY', VAPID_PUBLIC_KEY);
requireEnv('VAPID_PRIVATE_KEY', VAPID_PRIVATE_KEY);

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  // Node < 22 has no global WebSocket; cron only uses PostgREST, but client still inits Realtime.
  realtime: { transport: ws },
});

function isGone(err) {
  const status = err?.statusCode ?? err?.status;
  return status === 404 || status === 410;
}

async function main() {
  const now = new Date();
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select(
      'id, user_id, endpoint, p256dh, auth, timezone, last_morning_sent_on, last_evening_sent_on',
    );

  if (error) throw error;
  if (!subs?.length) {
    console.log(`[${now.toISOString()}] No subscriptions.`);
    return;
  }

  const userIds = [...new Set(subs.map((s) => s.user_id))];
  const { data: progressRows, error: progressError } = await supabase
    .from('user_progress')
    .select('user_id, data')
    .in('user_id', userIds);

  if (progressError) throw progressError;

  const progressByUser = new Map(
    (progressRows ?? []).map((row) => [row.user_id, row.data]),
  );

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const sub of subs) {
    const progress = progressByUser.get(sub.user_id) ?? null;
    const reminderTime =
      typeof progress?.settings?.reminderTime === 'string' &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(progress.settings.reminderTime)
        ? progress.settings.reminderTime
        : DEFAULT_REMINDER_TIME;

    if (progress?.settings?.pushEnabled === false) {
      skipped += 1;
      continue;
    }

    const decision = decideReminder({
      now,
      timeZone: sub.timezone || 'UTC',
      reminderTime,
      lastMorningSentOn: sub.last_morning_sent_on,
      lastEveningSentOn: sub.last_evening_sent_on,
      progress,
    });

    if (!decision) {
      skipped += 1;
      continue;
    }

    const payload = JSON.stringify({
      title: decision.title,
      body: decision.body,
      url: decision.url,
      tag: decision.tag,
    });

    if (DRY_RUN) {
      console.log(
        `[dry-run] would send ${decision.kind} to user ${sub.user_id} (${decision.localDate})`,
      );
      sent += 1;
      continue;
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      );

      const patch =
        decision.kind === 'morning'
          ? { last_morning_sent_on: decision.localDate, updated_at: now.toISOString() }
          : { last_evening_sent_on: decision.localDate, updated_at: now.toISOString() };

      await supabase.from('push_subscriptions').update(patch).eq('id', sub.id);
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(`Failed push for ${sub.id}:`, err?.statusCode ?? err?.message ?? err);
      if (isGone(err)) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        console.log(`Removed expired subscription ${sub.id}`);
      }
    }
  }

  console.log(
    `[${now.toISOString()}] done: sent=${sent} skipped=${skipped} failed=${failed} total=${subs.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
