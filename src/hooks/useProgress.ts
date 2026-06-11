import { useCallback, useEffect, useState } from 'react';
import { evaluateBadges } from '../lib/badges';
import { getLocalDateString } from '../lib/dateUtils';
import { getProgress, subscribe } from '../lib/storage';
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
      if (e.key === 'fasted-calendar-progress') refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  return progress;
}
