import { useEffect, useState } from 'react';
import { getSyncStatus, subscribeSyncStatus } from '../lib/sync';
import type { SyncStatus } from '../lib/sync';

export function useSyncStatus(): SyncStatus {
  const [status, setSyncStatus] = useState<SyncStatus>(getSyncStatus);

  useEffect(() => subscribeSyncStatus(() => setSyncStatus(getSyncStatus())), []);

  return status;
}
