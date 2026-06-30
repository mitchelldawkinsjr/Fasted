import { useState } from 'react';
import type { CommitmentDefinition, MemberCovenant } from '../types';
import { formatDisplayDate } from '../lib/dateUtils';
import { LoadingButton } from './LoadingButton';
import { Icon } from './Icon';
import { CommitmentList } from './CommitmentList';

type Props = {
  groupName: string;
  commitments: CommitmentDefinition[];
  existing?: MemberCovenant | null;
  onSign?: (signature: string) => Promise<void>;
  onClose?: () => void;
};

export function CovenantModal({
  groupName,
  commitments,
  existing,
  onSign,
  onClose,
}: Props) {
  const [signature, setSignature] = useState(existing?.signature ?? '');
  const [acknowledged, setAcknowledged] = useState(Boolean(existing));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewOnly = Boolean(existing);
  const displayedCommitments = viewOnly && existing ? existing.commitments_snapshot : commitments;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (viewOnly || !onSign) return;
    if (!signature.trim() || !acknowledged) return;

    setBusy(true);
    setError(null);
    try {
      await onSign(signature.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign covenant');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface-container-lowest shadow-grace-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="covenant-title"
      >
        <div className="flex items-center justify-between border-b border-surface-variant px-gutter py-4">
          <h2 id="covenant-title" className="font-display text-headline-md text-primary">
            {viewOnly ? 'Signed Covenant' : 'My Commitment'}
          </h2>
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-surface-container">
              <Icon name="close" />
            </button>
          )}
        </div>

        <div className="space-y-4 p-gutter">
          <p className="text-body-md text-on-surface">
            {viewOnly ? (
              <>
                Covenant for <strong>{groupName}</strong>
              </>
            ) : (
              <>
                Before day one of <strong>{groupName}</strong>, sign your commitment to these daily
                promises:
              </>
            )}
          </p>

          <CommitmentList commitments={displayedCommitments} />

          {viewOnly && existing && (
            <div className="rounded-xl border border-secondary/30 bg-secondary-container/20 p-4">
              <p className="text-body-md text-on-surface">
                Signed: <strong>{existing.signature}</strong>
              </p>
              <p className="text-label-caps text-on-surface-variant">
                Date: {formatDisplayDate(existing.signed_at.slice(0, 10))}
              </p>
              <p className="mt-2 text-body-md text-on-surface-variant">
                I understand this is a commitment before God and my leader.
              </p>
            </div>
          )}

          {!viewOnly && (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-body-md text-on-surface">Your signature</span>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Type your full name"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                  required
                />
              </label>

              <label className="flex items-start gap-2 text-body-md text-on-surface">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded accent-primary"
                  required
                />
                <span>I understand this is a commitment before God and my leader.</span>
              </label>

              {error && <p className="text-body-md text-error">{error}</p>}

              <LoadingButton
                type="submit"
                loading={busy}
                disabled={!signature.trim() || !acknowledged}
                className="w-full"
              >
                Sign Covenant
              </LoadingButton>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
