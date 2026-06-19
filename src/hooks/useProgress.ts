import { useCallback, useEffect, useState } from 'react';
import { evaluateBadges } from '../lib/badges';
import { getLocalDateString } from '../lib/dateUtils';
import { GUEST_STORAGE_KEY, LEGACY_STORAGE_KEY, getProgress, subscribe } from '../lib/storage';
import type { UserProgress } from '../types';

function isProgressStorageKey(key: string | null): boolean {
  if (!key) return false;
  return (
    key === LEGACY_STORAGE_KEY ||
    key === GUEST_STORAGE_KEY ||
    key.startsWith('fasted-calendar-progress:')
  );
}

export function useProgress(): UserProgress {
  const [progress, setProgress] = useState<UserProgress>(getProgress);

  useEffect(() => {
    evaluateBadges(getLocalDateString());
    return subscribe(() => setProgress(getProgress()));
  }, []);

  const refresh = useCallback(() => setProgress(getProgress()), []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (isProgressStorageKey(e.key)) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  return progress;
}
