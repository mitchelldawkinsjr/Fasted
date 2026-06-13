import { GUEST_STORAGE_KEY, LEGACY_STORAGE_KEY } from './storage';

const STORAGE_PREFIX = 'fasted-calendar-progress';

export function isProgressStorageKey(key: string | null): boolean {
  if (!key) return false;
  return key === LEGACY_STORAGE_KEY || key === GUEST_STORAGE_KEY || key.startsWith(`${STORAGE_PREFIX}:`);
}
