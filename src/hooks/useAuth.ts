import { useEffect, useState } from 'react';
import { getPocketBase, isSyncConfigured, type UserRecord } from '../lib/pocketbase';

export function useAuth() {
  const [user, setUser] = useState<UserRecord | null>(() => {
    if (!isSyncConfigured()) return null;
    try {
      return getPocketBase().authStore.record as UserRecord | null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!isSyncConfigured()) return;

    const pb = getPocketBase();
    setUser(pb.authStore.record as UserRecord | null);

    return pb.authStore.onChange(() => {
      setUser(pb.authStore.record as UserRecord | null);
    });
  }, []);

  return {
    user,
    isConfigured: isSyncConfigured(),
    isLoggedIn: Boolean(user),
    email: user?.email,
    name: user?.name,
  };
}
