import { VERSES, type DailyVerse } from '../data/verses';
import { parseLocalDate } from './dateUtils';

const MS_PER_DAY = 86_400_000;

/** Deterministic verse index for a calendar date (same date → same verse). */
export function selectVerseIndexForDate(dateStr: string, verseCount: number): number {
  if (verseCount <= 0) return 0;
  const date = parseLocalDate(dateStr);
  const daysSinceEpoch = Math.floor(date.getTime() / MS_PER_DAY);
  return ((daysSinceEpoch % verseCount) + verseCount) % verseCount;
}

export function resolveVerseForDate(dateStr: string): DailyVerse {
  const index = selectVerseIndexForDate(dateStr, VERSES.length);
  return VERSES[index];
}
