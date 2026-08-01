import type { FastType } from '../types';

export const FAST_TYPE_LABELS: Record<FastType, string> = {
  'normal-eating': 'Preparation / Normal Eating Day',
  'sunrise-to-sunset-water': 'Sunrise → Sunset · Water Only',
  'sunrise-to-sunset-with-coffee-tea': 'Sunrise → Sunset · Water, Coffee & Tea',
  'daniel-fast': 'Daniel Fast Day',
  'twenty-four-hour-water': '24-Hour Water Fast',
  'extended-prayer': 'Extended Prayer Day',
};

export const FAST_SCHEDULE_LABELS: Record<FastType, string> = {
  'normal-eating': 'Normal eating day',
  'sunrise-to-sunset-water': 'Sunrise → Sunset',
  'sunrise-to-sunset-with-coffee-tea': 'Sunrise → Sunset',
  'daniel-fast': 'Daniel Fast',
  'twenty-four-hour-water': '24-Hour Fast',
  'extended-prayer': 'Extended Prayer',
};

export function getTimeGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/** Keep encouragement concise for the home screen hero area. */
export function conciseEncouragement(message: string, maxSentences = 2): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;
  const sentences = trimmed.match(/[^.!?]+[.!?]+/g) ?? [trimmed];
  if (sentences.length <= maxSentences) return trimmed;
  return sentences.slice(0, maxSentences).join(' ').trim();
}
