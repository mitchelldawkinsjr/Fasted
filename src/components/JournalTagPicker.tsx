import { JOURNAL_TAG_LABELS, JOURNAL_TAGS } from '../lib/journalTags';
import type { JournalTag } from '../types';

type Props = {
  value: JournalTag[];
  onChange: (tags: JournalTag[]) => void;
  className?: string;
};

export function JournalTagPicker({ value, onChange, className = '' }: Props) {
  const toggle = (tag: JournalTag) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  return (
    <fieldset className={className}>
      <legend className="mb-2 block text-body-md font-medium text-on-surface">
        Reflection type
      </legend>
      <p className="mb-3 text-label-caps text-on-surface-variant">
        Choose one or more — used to filter your journal later.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {JOURNAL_TAGS.map((tag) => {
          const selected = value.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              aria-pressed={selected}
              className={`rounded-full px-2 py-1.5 text-center label-caps leading-tight transition-colors ${
                selected
                  ? 'bg-primary text-on-primary grace-shadow'
                  : 'border border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              {JOURNAL_TAG_LABELS[tag]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

type BadgeProps = {
  tags: JournalTag[];
  className?: string;
};

export function JournalTagBadges({ tags, className = '' }: BadgeProps) {
  if (tags.length === 0) return null;

  return (
    <div className={`mt-3 flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded bg-surface-container-high px-2 py-0.5 text-[10px] font-label-caps uppercase tracking-wider text-on-tertiary-fixed-variant"
        >
          #{JOURNAL_TAG_LABELS[tag].toUpperCase()}
        </span>
      ))}
    </div>
  );
}
