import { VERSES, type DailyVerse } from '../data/verses';

const MS_PER_DAY = 86_400_000;

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Deterministic verse for a calendar date (same date → same verse). */
export function resolveVerseForDate(dateStr: string): DailyVerse {
  const date = parseLocalDate(dateStr);
  const daysSinceEpoch = Math.floor(date.getTime() / MS_PER_DAY);
  const index = ((daysSinceEpoch % VERSES.length) + VERSES.length) % VERSES.length;
  return VERSES[index];
}
