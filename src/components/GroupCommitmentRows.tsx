import type { CommitmentDefinition, CommitmentResult } from '../types';
import { commitmentValueMet } from '../lib/groupCheckIns';

type Props = {
  commitments: CommitmentDefinition[];
  results: CommitmentResult[];
  onChange: (results: CommitmentResult[]) => void;
};

export function GroupCommitmentRows({ commitments, results, onChange }: Props) {
  const getResult = (commitmentId: string): CommitmentResult => {
    return (
      results.find((r) => r.commitmentId === commitmentId) ?? {
        commitmentId,
        honored: false,
      }
    );
  };

  const updateResult = (commitmentId: string, patch: Partial<CommitmentResult>) => {
    const existing = getResult(commitmentId);
    const next = { ...existing, ...patch, commitmentId };
    const filtered = results.filter((r) => r.commitmentId !== commitmentId);
    onChange([...filtered, next]);
  };

  return (
    <div className="space-y-2">
      {commitments.map((commitment) => {
        const result = getResult(commitment.id);

        if (commitment.shape === 'yes_no') {
          return (
            <label
              key={commitment.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3"
            >
              <input
                type="checkbox"
                checked={result.honored}
                onChange={(e) => updateResult(commitment.id, { honored: e.target.checked })}
                className="h-4 w-4 rounded accent-primary"
              />
              <span className="text-body-md text-on-surface">{commitment.label}</span>
            </label>
          );
        }

        if (commitment.shape === 'duration') {
          return (
            <label key={commitment.id} className="block rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
              <span className="mb-1 block text-body-md text-on-surface">
                {commitment.label}
                {commitment.target != null && (
                  <span className="text-on-surface-variant">
                    {' '}
                    (target: {commitment.target}
                    {' min'})
                  </span>
                )}
              </span>
              <input
                type="number"
                min={0}
                value={typeof result.value === 'number' ? result.value : ''}
                onChange={(e) => {
                  const value = e.target.value ? Number(e.target.value) : undefined;
                  updateResult(commitment.id, {
                    value,
                    honored: commitmentValueMet(commitment, value),
                  });
                }}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md"
              />
            </label>
          );
        }

        return (
          <label key={commitment.id} className="block rounded-xl border border-outline-variant/30 bg-surface-container-low p-3">
            <span className="mb-1 block text-body-md text-on-surface">{commitment.label}</span>
            <textarea
              rows={2}
              value={typeof result.value === 'string' ? result.value : ''}
              onChange={(e) => {
                const value = e.target.value;
                updateResult(commitment.id, {
                  value,
                  honored: commitmentValueMet(commitment, value),
                });
              }}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md"
            />
          </label>
        );
      })}
    </div>
  );
}
