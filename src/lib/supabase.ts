import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export function isSyncConfigured(): boolean {
  return getSupabaseConfigIssue() === null;
}

/** Returns a user-facing config problem, or null when env vars look valid. */
export function getSupabaseConfigIssue(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

  if (!url) return 'VITE_SUPABASE_URL is not set';
  if (!anonKey) return 'VITE_SUPABASE_ANON_KEY is not set';

  try {
    new URL(url);
  } catch {
    return 'VITE_SUPABASE_URL is not a valid URL';
  }

  return null;
}

export const supabase = isSyncConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export function getSupabase() {
  if (!supabase) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not configured');
  }
  return supabase;
}

export type UserRecord = {
  id: string;
  email?: string;
  name?: string;
  createdAt?: string;
};

export const PROGRESS_TABLE = 'user_progress';

export const ORGANIZATIONS_TABLE = 'organizations';
export const JOURNEYS_TABLE = 'journeys';
export const GROUPS_TABLE = 'groups';
export const GROUP_MEMBERSHIPS_TABLE = 'group_memberships';
export const SHARED_JOURNAL_TABLE = 'shared_journal_entries';
export const PRAYER_REQUESTS_TABLE = 'prayer_requests';
export const GROUP_CHECKIN_STATS_VIEW = 'group_checkin_stats';
