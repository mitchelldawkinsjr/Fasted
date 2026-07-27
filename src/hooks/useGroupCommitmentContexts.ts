import { useEffect, useState } from 'react';
import { getGroupCommitments, getMyCovenant, listMyGroups } from '../lib/groups';
import { getGroupCheckIn } from '../lib/storage';
import type { CommitmentDefinition, CommitmentResult, GroupRecord } from '../types';

export type GroupCommitmentContext = {
  group: GroupRecord;
  commitments: CommitmentDefinition[];
  existingResults?: CommitmentResult[];
  hasExistingCheckIn: boolean;
};

export function useGroupCommitmentContexts(date: string) {
  const [groupContexts, setGroupContexts] = useState<GroupCommitmentContext[]>([]);
  const [groupResults, setGroupResults] = useState<Record<string, CommitmentResult[]>>({});

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const myGroups = await listMyGroups();
        const contexts: GroupCommitmentContext[] = [];

        for (const group of myGroups) {
          const covenant = await getMyCovenant(group.id);
          if (!covenant) continue;

          const commitments = await getGroupCommitments(group.id);
          if (commitments.length === 0) continue;

          const existingGroupCheckIn = getGroupCheckIn(group.id, date);
          contexts.push({
            group,
            commitments,
            existingResults: existingGroupCheckIn?.results,
            hasExistingCheckIn: !!existingGroupCheckIn,
          });
        }

        if (!cancelled) setGroupContexts(contexts);
      } catch {
        if (!cancelled) setGroupContexts([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date]);

  useEffect(() => {
    const initial: Record<string, CommitmentResult[]> = {};
    for (const ctx of groupContexts) {
      initial[ctx.group.id] = ctx.existingResults ?? [];
    }
    setGroupResults(initial);
  }, [groupContexts]);

  return { groupContexts, groupResults, setGroupResults };
}
