import { useCallback, useEffect, useState } from 'react';
import { evaluateBadges } from '../lib/badges';
import { getLocalDateString } from '../lib/dateUtils';
import { getProgress, subscribe } from '../lib/storage';
import { isProgressStorageKey } from '../lib/storageKeys';
import type { UserProgress } from '../types';

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
