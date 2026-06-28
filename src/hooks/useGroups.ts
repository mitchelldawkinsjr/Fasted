import { useCallback, useEffect, useRef, useState } from 'react';
import type { GroupRecord } from '../types';
import { listMyGroups } from '../lib/groups';
import { isSyncConfigured } from '../lib/supabase';

export function useGroups() {
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!isSyncConfigured()) {
      setGroups([]);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const next = await listMyGroups();
      if (requestId !== requestIdRef.current) return;

      setGroups(next);
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;

      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { groups, loading, error, refresh };
}
