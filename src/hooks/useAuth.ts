import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { formatAuthError } from '../lib/authErrors';
import { getSupabase, isSyncConfigured, type UserRecord } from '../lib/supabase';
import { signIn as syncSignIn, signOut as syncSignOut, type AuthResult } from '../lib/sync';

function sessionToUser(session: Session | null): UserRecord | null {
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.user_metadata?.full_name as string | undefined,
    createdAt: session.user.created_at,
  };
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSyncConfigured()) {
      setInitialized(true);
      return;
    }

    const client = getSupabase();

    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          setSessionError(formatAuthError(error));
        }
        setSession(data.session);
        setInitialized(true);
      })
      .catch((err: unknown) => {
        setSessionError(formatAuthError(err));
        setInitialized(true);
      });

    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        setSessionError(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      return await syncSignIn(email, password);
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error(formatAuthError(err));
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await syncSignOut();
  }, []);

  const user = sessionToUser(session);

  return {
    user,
    isConfigured: isSyncConfigured(),
    isLoggedIn: initialized && !!session?.user,
    email: user?.email,
    name: user?.name,
    memberSince: user?.createdAt,
    sessionError,
    signIn,
    signOut,
  };
}
