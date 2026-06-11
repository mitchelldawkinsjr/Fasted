import { useEffect, useState } from 'react';
import { getPocketBase, isSyncConfigured } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';

export function useAuth() {
  const [user, setUser] = useState<RecordModel | null>(() => {
    if (!isSyncConfigured()) return null;
    try {
      return getPocketBase().authStore.record;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!isSyncConfigured()) return;

    const pb = getPocketBase();
    setUser(pb.authStore.record);

    return pb.authStore.onChange(() => {
      setUser(pb.authStore.record);
    });
  }, []);

  return {
    user,
    isConfigured: isSyncConfigured(),
    isLoggedIn: Boolean(user),
    email: user?.email as string | undefined,
  };
}
