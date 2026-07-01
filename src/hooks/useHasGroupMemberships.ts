import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { hasMyGroupMemberships } from '../lib/groups';
import { isSyncConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useHasGroupMemberships() {
  const { pathname } = useLocation();
  const { user, isLoggedIn, initialized: authInitialized } = useAuth();
  const userId = user?.id;
  const [hasMemberships, setHasMemberships] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);
  const scopedUserIdRef = useRef<string | undefined>();
  const prevPathnameRef = useRef(pathname);

  const refresh = useCallback(
    async (background = false) => {
      if (!authInitialized || !isLoggedIn || !userId) {
        setHasMemberships(false);
        setLoading(false);
        return;
      }

      if (!isSyncConfigured()) {
        setHasMemberships(false);
        setLoading(false);
        return;
      }

      const requestId = ++requestIdRef.current;
      if (!background) {
        setLoading(true);
      }

      try {
        const next = await hasMyGroupMemberships();
        if (requestId !== requestIdRef.current) return;
        setHasMemberships(next);
      } catch {
        if (requestId !== requestIdRef.current) return;
        if (!background) {
          setHasMemberships(false);
        }
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
      prevPathnameRef.current = pathname;
      setHasMemberships(false);
      setLoading(false);
      return;
    }

    const userChanged = scopedUserIdRef.current !== userId;
    const pathnameChanged = prevPathnameRef.current !== pathname;
    scopedUserIdRef.current = userId;
    prevPathnameRef.current = pathname;

    if (userChanged) {
      setHasMemberships(false);
    }

    void refresh(!userChanged && pathnameChanged);
  }, [authInitialized, isLoggedIn, userId, pathname, refresh]);

  return { hasMemberships, loading, refresh };
}
