import { useEffect, useState } from 'react';
import type { CommitmentDefinition, CommitmentResult, GroupRecord } from '../types';
import { getGroupCommitments, getMyCovenant, listMyGroups } from '../lib/groups';
import { getGroupCheckIn } from '../lib/storage';

export type GroupCommitmentContext = {
  group: GroupRecord;
  commitments: CommitmentDefinition[];
  existingResults?: CommitmentResult[];
};

export function useGroupCommitmentsForCheckIn(date: string) {
  const [groups, setGroups] = useState<GroupCommitmentContext[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const myGroups = await listMyGroups();
        const contexts: GroupCommitmentContext[] = [];

        for (const group of myGroups) {
          const covenant = await getMyCovenant(group.id);
          if (!covenant) continue;

          const commitments = await getGroupCommitments(group.id);
          if (commitments.length === 0) continue;

          const existing = getGroupCheckIn(group.id, date);
          contexts.push({
            group,
            commitments,
            existingResults: existing?.results,
          });
        }

        if (!cancelled) setGroups(contexts);
      } catch {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date]);

  return { groups, loading };
}
