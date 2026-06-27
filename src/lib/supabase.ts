import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export function isSyncConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
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
