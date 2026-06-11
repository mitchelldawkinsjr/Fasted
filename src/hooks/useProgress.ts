import { useCallback, useEffect, useState } from 'react';
import { getProgress, subscribe } from '../lib/storage';
import type { UserProgress } from '../types';

export function useProgress(): UserProgress {
  const [progress, setProgress] = useState<UserProgress>(getProgress);

  useEffect(() => {
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
