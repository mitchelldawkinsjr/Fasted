import { useState } from 'react';
import type { CommitmentDefinition, GroupPrivacy, Journey } from '../types';
import { createCommitmentPreset } from '../data/commitmentPresets';
import { formatGroupError } from '../lib/groupErrors';
import { createGroup } from '../lib/groups';
import { CommitmentEditor } from './CommitmentEditor';
import { JourneyBuilder } from './JourneyBuilder';
import { LoadingButton } from './LoadingButton';
import { Icon } from './Icon';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (groupId: string) => void;
};

export function CreateGroupModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState<GroupPrivacy>('anonymous');
  const [journeyType, setJourneyType] = useState<'built-in' | 'custom'>('built-in');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitments, setCommitments] = useState<CommitmentDefinition[]>(() =>
    createCommitmentPreset('fasted-default'),
  );

  if (!open) return null;

  const inputClass =
    'w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  const handleCreateBuiltIn = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const group = await createGroup({
        name: name.trim(),
        privacy,
        journeyType: 'built-in',
        displayName: displayName.trim() || undefined,
        commitments,
      });
      onCreated(group.id);
      onClose();
      setName('');
      setDisplayName('');
      setCommitments(createCommitmentPreset('fasted-default'));
    } catch (err) {
      setError(formatGroupError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCustomJourney = async (journey: Journey) => {
    setBusy(true);
    setError(null);
    try {
      const group = await createGroup({
        name: name.trim(),
        privacy,
        journeyType: 'custom',
        customJourney: {
          name: journey.name,
          startDate: journey.startDate,
          phases: journey.phases,
        },
        displayName: displayName.trim() || undefined,
        commitments,
      });
      setBuilderOpen(false);
      onCreated(group.id);
      onClose();
      setName('');
      setDisplayName('');
      setCommitments(createCommitmentPreset('fasted-default'));
    } catch (err) {
      setError(formatGroupError(err));
      throw err;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center">
        <div
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface-container-lowest shadow-grace-up"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-group-title"
        >
          <div className="flex items-center justify-between border-b border-surface-variant px-gutter py-4">
            <h2 id="create-group-title" className="font-display text-headline-md text-primary">
              Create Group
            </h2>
            <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-surface-container">
              <Icon name="close" />
            </button>
          </div>

          <div className="space-y-4 p-gutter">
            <label className="block">
              <span className="mb-1 block text-body-md text-on-surface">Group name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Summer Fast Cohort"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-body-md text-on-surface">Your display name (optional)</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How leaders see you in named mode"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-body-md text-on-surface">Privacy</span>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value as GroupPrivacy)}
                className={inputClass}
              >
                <option value="anonymous">Anonymous — leaders see aggregates only</option>
                <option value="named">Named — leaders see member identities</option>
              </select>
            </label>

            <fieldset className="space-y-2">
              <legend className="text-body-md text-on-surface">Journey</legend>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="journeyType"
                  checked={journeyType === 'built-in'}
                  onChange={() => setJourneyType('built-in')}
                />
                <span className="text-body-md">Fasted Journey (8 phases)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="journeyType"
                  checked={journeyType === 'custom'}
                  onChange={() => setJourneyType('custom')}
                />
                <span className="text-body-md">Custom journey</span>
              </label>
            </fieldset>

            <CommitmentEditor commitments={commitments} onChange={setCommitments} />

            {error && <p className="text-body-md text-error">{error}</p>}

            {journeyType === 'built-in' ? (
              <LoadingButton
                type="button"
                loading={busy}
                disabled={!name.trim()}
                className="w-full"
                onClick={() => void handleCreateBuiltIn()}
              >
                Create Group
              </LoadingButton>
            ) : (
              <LoadingButton
                type="button"
                disabled={!name.trim()}
                className="w-full"
                onClick={() => setBuilderOpen(true)}
              >
                Configure Custom Journey
              </LoadingButton>
            )}
          </div>
        </div>
      </div>

      <JourneyBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onComplete={handleCustomJourney}
        title="Group Journey"
        confirmLabel="Create Group"
      />
    </>
  );
}
