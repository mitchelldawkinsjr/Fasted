#!/usr/bin/env node
/**
 * One-time migration: PocketBase progress records → Supabase user_progress.
 *
 * READ-ONLY against PocketBase. Idempotent upserts into Supabase.
 *
 * Required env:
 *   POCKETBASE_URL              e.g. https://api.example.com
 *   POCKETBASE_ADMIN_EMAIL
 *   POCKETBASE_ADMIN_PASSWORD
 *   SUPABASE_URL                e.g. https://api.example.com
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/migrate-pb-to-supabase.mjs --dry-run
 *   node scripts/migrate-pb-to-supabase.mjs
 */
import crypto from 'crypto';

const dryRun = process.argv.includes('--dry-run');

const POCKETBASE_URL = (process.env.POCKETBASE_URL ?? '').replace(/\/$/, '');
const PB_ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL ?? '';
const PB_ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD ?? '';
const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
}

requireEnv('POCKETBASE_URL', POCKETBASE_URL);
requireEnv('POCKETBASE_ADMIN_EMAIL', PB_ADMIN_EMAIL);
requireEnv('POCKETBASE_ADMIN_PASSWORD', PB_ADMIN_PASSWORD);
requireEnv('SUPABASE_URL', SUPABASE_URL);
requireEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY);

let pbAdminToken = null;
const userEmailCache = new Map();

async function pbAdminAuth() {
  const res = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: PB_ADMIN_EMAIL, password: PB_ADMIN_PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`PocketBase admin auth failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  pbAdminToken = data.token;
}

async function pbFetch(path) {
  const res = await fetch(`${POCKETBASE_URL}${path}`, {
    headers: { Authorization: pbAdminToken },
  });
  if (!res.ok) {
    throw new Error(`PocketBase GET ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function fetchAllProgressRecords() {
  const records = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const data = await pbFetch(
      `/api/collections/progress/records?page=${page}&perPage=${perPage}`,
    );
    records.push(...(data.items ?? []));
    if (page >= (data.totalPages ?? 1)) break;
    page += 1;
  }
  return records;
}

async function getUserEmail(userId) {
  if (userEmailCache.has(userId)) return userEmailCache.get(userId);
  try {
    const user = await pbFetch(`/api/collections/users/records/${userId}`);
    const email = user.email ?? null;
    userEmailCache.set(userId, email);
    return email;
  } catch {
    userEmailCache.set(userId, null);
    return null;
  }
}

async function supabaseAdmin(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  return res;
}

async function findSupabaseUserByEmail(email) {
  const res = await supabaseAdmin(
    `/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
  );
  if (!res.ok) {
    throw new Error(`Supabase user lookup failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const users = data.users ?? data;
  if (Array.isArray(users) && users.length > 0) return users[0];
  return null;
}

async function createSupabaseUser(email, name, password) {
  const res = await supabaseAdmin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { full_name: name } : {},
    }),
  });
  if (!res.ok) {
    throw new Error(`Supabase user create failed for ${email}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function randomPassword() {
  return crypto.randomBytes(24).toString('base64url');
}

function progressUpdatedAt(record) {
  const data = record.data;
  if (data && typeof data === 'object' && data.updatedAt) {
    return data.updatedAt;
  }
  return record.updated ?? record.created ?? new Date().toISOString();
}

async function upsertProgress(userId, data, updatedAt) {
  const res = await supabaseAdmin('/rest/v1/user_progress?on_conflict=user_id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      data,
      updated_at: updatedAt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Supabase upsert failed: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  console.log(dryRun ? '=== DRY RUN (no writes to Supabase) ===' : '=== LIVE MIGRATION ===');
  console.log(`PocketBase: ${POCKETBASE_URL} (read-only)`);
  console.log(`Supabase:   ${SUPABASE_URL}`);

  await pbAdminAuth();
  const records = await fetchAllProgressRecords();
  console.log(`Found ${records.length} PocketBase progress record(s)`);

  if (records.length === 0) {
    console.log('Nothing to migrate.');
    return;
  }

  const timestamps = records.map(progressUpdatedAt).sort();
  console.log(`Date range: ${timestamps[0]} → ${timestamps[timestamps.length - 1]}`);

  let upserted = 0;
  let skippedNoEmail = 0;
  let skippedNoSupabaseUser = 0;
  let usersCreated = 0;
  let errors = 0;

  for (const record of records) {
    const pbUserId = record.user;
    const email = await getUserEmail(pbUserId);

    if (!email) {
      console.warn(`  SKIP: progress ${record.id} — no email for PocketBase user ${pbUserId}`);
      skippedNoEmail += 1;
      continue;
    }

    let supabaseUser = await findSupabaseUserByEmail(email);

    if (!supabaseUser) {
      if (dryRun) {
        console.log(`  WOULD CREATE Supabase user: ${email}`);
        console.log(`  WOULD UPSERT progress for ${email}`);
        upserted += 1;
        continue;
      }

      const pbUser = await pbFetch(`/api/collections/users/records/${pbUserId}`);
      const tempPassword = randomPassword();
      supabaseUser = await createSupabaseUser(email, pbUser.name ?? '', tempPassword);
      usersCreated += 1;
      console.log(`  CREATED Supabase user: ${email} (temp password — user must reset via forgot password)`);
    }

    const updatedAt = progressUpdatedAt(record);

    if (dryRun) {
      console.log(`  WOULD UPSERT progress for ${email} (updated ${updatedAt})`);
      upserted += 1;
      continue;
    }

    try {
      await upsertProgress(supabaseUser.id, record.data, updatedAt);
      console.log(`  UPSERTED progress for ${email}`);
      upserted += 1;
    } catch (err) {
      console.error(`  ERROR for ${email}:`, err instanceof Error ? err.message : err);
      errors += 1;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Records processed: ${records.length}`);
  console.log(`Upserted:          ${upserted}`);
  console.log(`Users created:     ${usersCreated}`);
  console.log(`Skipped (no email): ${skippedNoEmail}`);
  console.log(`Skipped (no SB user): ${skippedNoSupabaseUser}`);
  console.log(`Errors:            ${errors}`);
  console.log('\nPocketBase was not modified.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
