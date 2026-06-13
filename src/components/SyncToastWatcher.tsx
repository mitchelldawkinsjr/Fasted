import { useEffect, useRef } from 'react';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { formatError, messages } from '../lib/messages';
import { toast } from '../lib/toast';
import type { SyncState } from '../lib/sync';

export function SyncToastWatcher() {
  const syncStatus = useSyncStatus();
  const previousState = useRef<SyncState>(syncStatus.state);

  useEffect(() => {
    const prev = previousState.current;
    const next = syncStatus.state;

    if (prev !== next) {
      if (next === 'error') {
        toast.error(formatError(syncStatus.error, messages.sync.failed));
      } else if (next === 'offline' && prev === 'syncing') {
        toast.info(messages.sync.offline);
      }

      previousState.current = next;
    }
  }, [syncStatus.error, syncStatus.state]);

  return null;
}
