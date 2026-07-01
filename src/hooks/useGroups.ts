import { useCallback, useEffect, useRef, useState } from 'react';
import type { GroupRecord } from '../types';
import { formatGroupError } from '../lib/authErrors';
import { listMyGroups } from '../lib/groups';
import { isSyncConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useGroups() {
  const { user, isLoggedIn, initialized: authInitialized } = useAuth();
  const userId = user?.id;
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const scopedUserIdRef = useRef<string | undefined>();

  const refresh = useCallback(
    async (background = false) => {
      if (!authInitialized || !isLoggedIn || !userId) {
        setGroups([]);
        setLoading(false);
        setError(null);
        return;
      }

      if (!isSyncConfigured()) {
        setGroups([]);
        setLoading(false);
        setError(null);
        return;
      }

      const requestId = ++requestIdRef.current;
      if (!background) {
        setLoading(true);
      }

      try {
        const next = await listMyGroups();
        if (requestId !== requestIdRef.current) return;

        setGroups(next);
        setError(null);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;

        setError(formatGroupError(err, 'Failed to load groups'));
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [authInitialized, isLoggedIn, userId],
  );

  useEffect(() => {
    if (!authInitialized) return;

    if (!isLoggedIn || !userId) {
      requestIdRef.current++;
      scopedUserIdRef.current = undefined;
      setGroups([]);
      setLoading(false);
      setError(null);
      return;
    }

    const userChanged = scopedUserIdRef.current !== userId;
    scopedUserIdRef.current = userId;

    if (userChanged) {
      setGroups([]);
    }

    void refresh(false);
  }, [authInitialized, isLoggedIn, userId, refresh]);

  return { groups, loading, error, refresh };
}
