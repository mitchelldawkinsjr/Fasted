import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, isSyncConfigured, type UserRecord } from '../lib/supabase';

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

  useEffect(() => {
    if (!isSyncConfigured()) {
      setInitialized(true);
      return;
    }

    const client = getSupabase();

    void client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitialized(true);
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const user = sessionToUser(session);

  return {
    user,
    isConfigured: isSyncConfigured(),
    isLoggedIn: initialized && !!session?.user,
    email: user?.email,
    name: user?.name,
    memberSince: user?.createdAt,
  };
}
