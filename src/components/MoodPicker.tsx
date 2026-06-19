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
        className="grid grid-cols-5 gap-2"
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
              className={`flex flex-col items-center gap-2 rounded-xl border p-2 transition-all ${
                selected
                  ? 'border-primary bg-surface-container-high shadow-grace scale-[1.02]'
                  : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container-high'
              }`}
            >
              <span
                className={`h-10 w-10 rounded-full ${option.swatchClass} ${
                  selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container-low' : ''
                }`}
                aria-hidden
              />
              <span
                className={`text-center text-[10px] font-label-caps leading-tight ${
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
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-1 text-label-caps text-on-surface-variant ${className}`}
    >
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${option.swatchClass}`}
        aria-hidden
      />
      {option.label}
    </span>
  );
}
