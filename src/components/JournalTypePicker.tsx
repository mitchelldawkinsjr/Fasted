import {
  JOURNAL_ENTRY_TYPE_LABELS,
  JOURNAL_ENTRY_TYPES,
  journalTypePillClass,
} from '../lib/journalTags';
import type { JournalEntryType } from '../types';

type Props = {
  value: JournalEntryType;
  onChange: (type: JournalEntryType) => void;
  prefilled?: boolean;
  className?: string;
};

export function JournalTypePicker({ value, onChange, prefilled = false, className = '' }: Props) {
  return (
    <fieldset className={className}>
      <legend className="mb-2 block text-body-md font-medium text-on-surface">
        Reflection type
      </legend>
      <p className="mb-3 text-label-caps text-on-surface-variant">
        {prefilled
          ? 'Pre-selected below — tap to change the reflection type.'
          : 'Daily Reflection uses the full form. Prayer, Gratitude, and Victory use a single entry box. Food and Fitness use their own prompts.'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {JOURNAL_ENTRY_TYPES.map((type) => {
          const selected = value === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              aria-pressed={selected}
              className={journalTypePillClass(selected)}
            >
              {JOURNAL_ENTRY_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Shared compact chip for journal metadata (type, mood, etc.). */
export const JOURNAL_META_CHIP_CLASS =
  'inline-flex items-center rounded bg-surface-container-high px-2 py-0.5 text-[10px] font-label-caps uppercase tracking-wider text-on-tertiary-fixed-variant';

type BadgeProps = {
  type: JournalEntryType;
  className?: string;
};

export function JournalTypeBadge({ type, className = '' }: BadgeProps) {
  return (
    <span className={`${JOURNAL_META_CHIP_CLASS} ${className}`}>
      #{JOURNAL_ENTRY_TYPE_LABELS[type].toUpperCase().replace(/\s+/g, ' ')}
    </span>
  );
}
