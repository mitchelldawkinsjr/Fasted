import type { DayMood } from '../types';

export type DayMoodOption = {
  value: DayMood;
  label: string;
  /** Tailwind background class for the mood swatch */
  swatchClass: string;
  /** Hex color for charts and inline styles */
  color: string;
};

/** Five-point daily mood scale — middle option uses "Okay" (neutral/steady day). */
export const DAY_MOOD_OPTIONS: DayMoodOption[] = [
  {
    value: 'amazing',
    label: 'Great',
    swatchClass: 'bg-[#3b8f4a]',
    color: '#3b8f4a',
  },
  {
    value: 'good',
    label: 'Good',
    swatchClass: 'bg-[#96cb75]',
    color: '#96cb75',
  },
  {
    value: 'okay',
    label: 'Okay',
    swatchClass: 'bg-gold',
    color: '#fed65b',
  },
  {
    value: 'bad',
    label: 'Rough',
    swatchClass: 'bg-[#e8955a]',
    color: '#e8955a',
  },
  {
    value: 'horrible',
    label: 'Overwhelming',
    swatchClass: 'bg-error',
    color: '#ba1a1a',
  },
];

export const DAY_MOOD_VALUES = DAY_MOOD_OPTIONS.map((option) => option.value);

export function isDayMood(value: unknown): value is DayMood {
  return typeof value === 'string' && DAY_MOOD_VALUES.includes(value as DayMood);
}

export function getDayMoodOption(mood: DayMood): DayMoodOption {
  return DAY_MOOD_OPTIONS.find((option) => option.value === mood) ?? DAY_MOOD_OPTIONS[2];
}

export function getDayMoodLabel(mood: DayMood): string {
  return getDayMoodOption(mood).label;
}
