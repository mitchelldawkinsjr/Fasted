import PocketBase, { type RecordModel } from 'pocketbase';

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL?.replace(/\/$/, '') ?? '';

let client: PocketBase | null = null;

export function isSyncConfigured(): boolean {
  return POCKETBASE_URL.length > 0;
}

export function getPocketBase(): PocketBase {
  if (!isSyncConfigured()) {
    throw new Error('VITE_POCKETBASE_URL is not configured');
  }
  if (!client) {
    client = new PocketBase(POCKETBASE_URL);
  }
  return client;
}

export type ProgressRecord = RecordModel & {
  user: string;
  data: unknown;
};

export const PROGRESS_COLLECTION = 'progress';
