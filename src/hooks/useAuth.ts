import { useEffect, useState } from 'react';
import { getPocketBase, isSyncConfigured, type UserRecord } from '../lib/pocketbase';

export function useAuth() {
  const [user, setUser] = useState<UserRecord | null>(() => {
    if (!isSyncConfigured()) return null;
    try {
      const pb = getPocketBase();
      return pb.authStore.isValid ? (pb.authStore.record as UserRecord | null) : null;
    } catch {
      return null;
    }
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (!isSyncConfigured()) return false;
    try {
      return getPocketBase().authStore.isValid;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!isSyncConfigured()) return;

    const pb = getPocketBase();

    const syncFromStore = () => {
      const valid = pb.authStore.isValid;
      setIsLoggedIn(valid);
      setUser(valid ? (pb.authStore.record as UserRecord | null) : null);
    };

    syncFromStore();
    return pb.authStore.onChange(syncFromStore);
  }, []);

  return {
    user,
    isConfigured: isSyncConfigured(),
    isLoggedIn,
    email: user?.email,
    name: user?.name,
    memberSince: user?.created,
  };
}
