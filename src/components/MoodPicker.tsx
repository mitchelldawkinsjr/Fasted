import { JOURNAL_META_CHIP_CLASS } from './JournalTypePicker';
import { DAY_MOOD_OPTIONS } from '../lib/dayMood';
import type { DayMood } from '../types';

type Props = {
  value: DayMood | null;
  onChange: (mood: DayMood) => void;
  className?: string;
};

export function MoodPicker({ value, onChange, className = '' }: Props) {
  return (
    <fieldset className={className}>
      <legend className="mb-1 block text-body-md font-medium text-on-surface">
        How did today feel?
      </legend>
      <p className="mb-3 text-label-caps text-on-surface-variant">
        Tap the color that best matches your day — tracked for phase summaries.
      </p>
      <div
        className="grid grid-cols-5 gap-1 sm:gap-2"
        role="radiogroup"
        aria-label="How did today feel?"
      >
        {DAY_MOOD_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              onClick={() => onChange(option.value)}
              className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl border p-1.5 transition-colors sm:gap-2 sm:p-2 ${
                selected
                  ? 'border-primary bg-surface-container-high shadow-grace'
                  : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container-high'
              }`}
            >
              <span
                className={`h-8 w-8 shrink-0 rounded-full sm:h-10 sm:w-10 ${option.swatchClass} ${
                  selected ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface-container-low sm:ring-offset-2' : ''
                }`}
                aria-hidden
              />
              <span
                className={`text-wrap-anywhere w-full text-center text-[10px] leading-tight sm:text-body-md sm:leading-snug ${
                  selected ? 'text-primary' : 'text-on-surface-variant'
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

type BadgeProps = {
  mood: DayMood;
  className?: string;
};

export function MoodBadge({ mood, className = '' }: BadgeProps) {
  const option = DAY_MOOD_OPTIONS.find((item) => item.value === mood) ?? DAY_MOOD_OPTIONS[2];

  return (
    <span className={`${JOURNAL_META_CHIP_CLASS} gap-1 ${className}`}>
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${option.swatchClass}`}
        aria-hidden
      />
      {option.label}
    </span>
  );
}
