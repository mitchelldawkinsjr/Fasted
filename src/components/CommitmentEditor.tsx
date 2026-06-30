import type { CommitmentDefinition, CommitmentShape } from '../types';
import {
  COMMITMENT_PRESET_LABELS,
  createCommitmentPreset,
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

function newCommitment(): CommitmentDefinition {
  return {
    id: `custom-${crypto.randomUUID().slice(0, 8)}`,
    label: '',
    shape: 'yes_no',
  };
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
            <div className="flex flex-wrap gap-2">
              <select
                value={commitment.shape}
                onChange={(e) =>
                  updateCommitment(index, { shape: e.target.value as CommitmentShape })
                }
                className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1 text-label-caps"
              >
                {SHAPES.map((shape) => (
                  <option key={shape.value} value={shape.value}>
                    {shape.label}
                  </option>
                ))}
              </select>
              {commitment.shape === 'duration' && (
                <input
                  type="number"
                  min={1}
                  value={commitment.target ?? ''}
                  onChange={(e) =>
                    updateCommitment(index, {
                      target: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="Target"
                  className="w-24 rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1 text-body-md"
                />
              )}
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onChange([...commitments, newCommitment()])}
        className="inline-flex items-center gap-1 text-body-md text-secondary"
      >
        <Icon name="add" size={18} />
        Add commitment
      </button>
    </div>
  );
}
