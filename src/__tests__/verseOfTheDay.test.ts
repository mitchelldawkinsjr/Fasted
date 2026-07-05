// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { VERSES } from '../data/verses';
import { getVerseOfTheDay, VERSE_OF_DAY_CACHE_KEY } from '../lib/storage';
import { resolveVerseForDate, selectVerseIndexForDate } from '../lib/verseOfTheDay';

afterEach(() => {
  localStorage.clear();
});

describe('selectVerseIndexForDate', () => {
  it('returns a stable index for the same date', () => {
    const index = selectVerseIndexForDate('2026-07-05', VERSES.length);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(VERSES.length);
    expect(selectVerseIndexForDate('2026-07-05', VERSES.length)).toBe(index);
  });

  it('returns a different index for consecutive days when possible', () => {
    const first = selectVerseIndexForDate('2026-07-05', VERSES.length);
    const second = selectVerseIndexForDate('2026-07-06', VERSES.length);
    expect(second).not.toBe(first);
  });

  it('handles empty verse lists safely', () => {
    expect(selectVerseIndexForDate('2026-07-05', 0)).toBe(0);
  });
});

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
});

describe('getVerseOfTheDay', () => {
  it('caches the resolved verse in localStorage', () => {
    const date = '2026-11-20';
    const verse = getVerseOfTheDay(date);
    expect(verse).toEqual(resolveVerseForDate(date));

    const cached = JSON.parse(localStorage.getItem(VERSE_OF_DAY_CACHE_KEY) ?? '{}');
    expect(cached).toEqual({ date, verseId: verse.id });
  });

  it('returns the cached verse for the same date without recomputing', () => {
    const date = '2026-12-01';
    const verse = VERSES[5];
    localStorage.setItem(
      VERSE_OF_DAY_CACHE_KEY,
      JSON.stringify({ date, verseId: verse.id }),
    );

    expect(getVerseOfTheDay(date)).toEqual(verse);
  });
});
