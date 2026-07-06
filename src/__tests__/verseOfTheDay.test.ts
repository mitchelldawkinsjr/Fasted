import { describe, expect, it } from 'vitest';
import { VERSES } from '../data/verses';
import { resolveVerseForDate } from '../lib/verseOfTheDay';

describe('resolveVerseForDate', () => {
  it('returns a verse from the predefined list', () => {
    const verse = resolveVerseForDate('2026-07-05');
    expect(VERSES).toContainEqual(verse);
    expect(verse.text.length).toBeGreaterThan(0);
    expect(verse.reference.length).toBeGreaterThan(0);
  });

  it('returns the same verse for the same date', () => {
    expect(resolveVerseForDate('2026-01-01')).toEqual(resolveVerseForDate('2026-01-01'));
  });

  it('returns a different verse for consecutive days when possible', () => {
    const first = resolveVerseForDate('2026-07-05');
    const second = resolveVerseForDate('2026-07-06');
    expect(second).not.toEqual(first);
  });
});
