import { useEffect, useState } from 'react';
import type { CommitmentDefinition, CommitmentShape } from '../types';
import {
  COMMITMENT_PRESET_LABELS,
  createCommitmentPreset,
  newCommitmentId,
  type CommitmentPresetId,
} from '../data/commitmentPresets';
import { Icon } from './Icon';

type Props = {
  commitments: CommitmentDefinition[];
  onChange: (commitments: CommitmentDefinition[]) => void;
};

const SHAPES: { value: CommitmentShape; label: string }[] = [
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'duration', label: 'Minutes' },
  { value: 'text_note', label: 'Short note' },
];

const DEFAULT_DURATION_TARGET = 1;

function formatDurationDraft(target: number | undefined): string {
  return target != null ? String(target) : String(DEFAULT_DURATION_TARGET);
}

function parsePositiveInt(raw: string): { value: number | null; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null, error: 'Enter a positive number of minutes.' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { value: null, error: 'Use whole minutes only (positive integer).' };
  }
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 1) {
    return { value: null, error: 'Duration must be at least 1 minute.' };
  }
  return { value, error: null };
}

export function getCommitmentDurationErrors(commitments: CommitmentDefinition[]): string[] {
  return commitments.flatMap((commitment, index) => {
    if (commitment.shape !== 'duration') return [];
    const label = commitment.label || `Commitment ${index + 1}`;
    if (commitment.target == null) {
      return [`"${label}" — Enter a positive number of minutes.`];
    }
    const parsed = parsePositiveInt(String(commitment.target));
    if (parsed.error) {
      return [`"${label}" — ${parsed.error}`];
    }
    return [];
  });
}

type DurationTargetFieldProps = {
  commitmentId: string;
  target: number | undefined;
  onChange: (target: number | undefined) => void;
};

function DurationTargetField({ commitmentId, target, onChange }: DurationTargetFieldProps) {
  const [draft, setDraft] = useState(() => formatDurationDraft(target));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(formatDurationDraft(target));
    setError(null);
  }, [commitmentId]);

  const commitDraft = (raw: string) => {
    const parsed = parsePositiveInt(raw);
    if (parsed.error) {
      setError(parsed.error);
      onChange(undefined);
      return;
    }
    setError(null);
    setDraft(String(parsed.value));
    onChange(parsed.value ?? undefined);
  };

  return (
    <div className="flex min-w-[7rem] flex-1 flex-col gap-1 sm:max-w-[8.5rem] sm:flex-none">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label="Duration in minutes"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${commitmentId}-duration-error` : undefined}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value.replace(/\D/g, ''));
          if (error) setError(null);
        }}
        onBlur={() => commitDraft(draft)}
        className="min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
      />
      {error && (
        <span id={`${commitmentId}-duration-error`} className="text-label-caps text-error">
          {error}
        </span>
      )}
    </div>
  );
}

export function CommitmentEditor({ commitments, onChange }: Props) {
  const inputClass =
    'w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  const applyPreset = (preset: CommitmentPresetId) => {
    onChange(createCommitmentPreset(preset));
  };

  const updateCommitment = (index: number, patch: Partial<CommitmentDefinition>) => {
    onChange(commitments.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const removeCommitment = (index: number) => {
    onChange(commitments.filter((_, i) => i !== index));
  };

  const handleShapeChange = (index: number, shape: CommitmentShape) => {
    if (shape === 'duration') {
      updateCommitment(index, {
        shape,
        target: commitments[index]?.target ?? DEFAULT_DURATION_TARGET,
      });
      return;
    }
    updateCommitment(index, { shape, target: undefined });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-md font-medium text-on-surface">Daily commitments</span>
        <select
          className="rounded-lg border border-outline-variant bg-surface-container-low px-2 py-1 text-label-caps"
          defaultValue=""
          onChange={(e) => {
            const preset = e.target.value as CommitmentPresetId;
            if (preset) applyPreset(preset);
            e.target.value = '';
          }}
        >
          <option value="" disabled>
            Apply preset…
          </option>
          {(Object.keys(COMMITMENT_PRESET_LABELS) as CommitmentPresetId[]).map((id) => (
            <option key={id} value={id}>
              {COMMITMENT_PRESET_LABELS[id]}
            </option>
          ))}
        </select>
      </div>

      <ul className="space-y-2">
        {commitments.map((commitment, index) => (
          <li
            key={commitment.id}
            className="space-y-2 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3"
          >
            <div className="flex items-start gap-2">
              <input
                type="text"
                value={commitment.label}
                onChange={(e) => updateCommitment(index, { label: e.target.value })}
                placeholder="Commitment label"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => removeCommitment(index)}
                className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
                aria-label="Remove commitment"
              >
                <Icon name="delete" size={18} />
              </button>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              <select
                value={commitment.shape}
                onChange={(e) => handleShapeChange(index, e.target.value as CommitmentShape)}
                className="min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-2 text-label-caps"
              >
                {SHAPES.map((shape) => (
                  <option key={shape.value} value={shape.value}>
                    {shape.label}
                  </option>
                ))}
              </select>
              {commitment.shape === 'duration' && (
                <DurationTargetField
                  commitmentId={commitment.id}
                  target={commitment.target}
                  onChange={(nextTarget) => updateCommitment(index, { target: nextTarget })}
                />
              )}
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() =>
          onChange([
            ...commitments,
            { id: newCommitmentId('custom'), label: '', shape: 'yes_no' },
          ])
        }
        className="inline-flex items-center gap-1 text-body-md text-secondary"
      >
        <Icon name="add" size={18} />
        Add commitment
      </button>
    </div>
  );
}
