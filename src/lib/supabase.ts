import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export function isSyncConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

const supabase = isSyncConfigured()
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

export const JOURNEYS_TABLE = 'journeys';
export const GROUPS_TABLE = 'groups';
export const GROUP_MEMBERSHIPS_TABLE = 'group_memberships';
export const SHARED_JOURNAL_TABLE = 'shared_journal_entries';
export const PRAYER_REQUESTS_TABLE = 'prayer_requests';
export const GROUP_COMMITMENTS_TABLE = 'group_commitments';
export const MEMBER_COVENANTS_TABLE = 'member_covenants';
export const TELEMETRY_EVENTS_TABLE = 'telemetry_events';
