import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CovenantModal } from '../components/CovenantModal';
import { LoadingButton } from '../components/LoadingButton';
import { RequireAuth } from '../components/RequireAuth';
import {
  getGroupCommitments,
  getMyCovenant,
  joinGroupByCode,
  previewGroupByCode,
  signMemberCovenant,
} from '../lib/groups';
import type { CommitmentDefinition } from '../types';
import { toast } from '../lib/toast';

type Step = 'preview' | 'covenant';

export function JoinGroupPage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<{ id: string; name: string; privacy: string } | null>(
    null,
  );
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>('preview');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [commitments, setCommitments] = useState<CommitmentDefinition[]>([]);

  useEffect(() => {
    if (!code) return;
    void previewGroupByCode(code)
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setLoading(false));
  }, [code]);

  const handleJoin = async () => {
    if (!code || !preview) return;
    setBusy(true);
    try {
      const joinedGroupId = await joinGroupByCode(code, displayName);
      const existingCovenant = await getMyCovenant(joinedGroupId);
      if (existingCovenant) {
        toast.success('Joined group');
        navigate(`/groups/${joinedGroupId}`);
        return;
      }

      const groupCommitments = await getGroupCommitments(joinedGroupId);
      setGroupId(joinedGroupId);
      setCommitments(groupCommitments);
      setStep('covenant');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not join group');
    } finally {
      setBusy(false);
    }
  };

  const handleSignCovenant = async (signature: string) => {
    if (!groupId) return;
    await signMemberCovenant(groupId, signature);
    toast.success('Covenant signed');
    navigate(`/groups/${groupId}`);
  };

  if (step === 'covenant' && groupId && preview) {
    return (
      <RequireAuth>
        <CovenantModal
          groupName={preview.name}
          commitments={commitments}
          onSign={handleSignCovenant}
        />
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="space-y-stack-lg animate-fade-in-up">
        <h2 className="font-display text-headline-lg-mobile text-primary">Join Group</h2>

        {loading && <p className="text-body-md text-on-surface-variant">Looking up invite…</p>}

        {!loading && !preview && (
          <p className="text-body-md text-on-surface-variant">
            Invite code <span className="font-mono">{code}</span> was not found.
          </p>
        )}

        {preview && (
          <>
            <p className="text-body-md text-on-surface">
              You are invited to join <strong>{preview.name}</strong> ({preview.privacy} mode).
            </p>
            <label className="block">
              <span className="mb-1 block text-body-md text-on-surface">
                Display name (optional, for named groups)
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </label>
            <LoadingButton type="button" loading={busy} className="w-full" onClick={() => void handleJoin()}>
              Join {preview.name}
            </LoadingButton>
          </>
        )}

        <Link to="/groups" className="inline-block text-secondary underline">
          Back to groups
        </Link>
      </div>
    </RequireAuth>
  );
}
