// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VerseOfTheDay } from '../components/VerseOfTheDay';
import { VERSES } from '../data/verses';
import { getVerseOfTheDay, VERSE_OF_DAY_CACHE_KEY } from '../lib/storage';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('VerseOfTheDay', () => {
  it('renders the cached verse for the given date', () => {
    const date = '2026-07-05';
    const verse = VERSES[0];
    localStorage.setItem(
      VERSE_OF_DAY_CACHE_KEY,
      JSON.stringify({ date, verseId: verse.id }),
    );

    render(<VerseOfTheDay date={date} />);

    expect(screen.getByRole('heading', { name: 'Verse of the Day' })).toBeTruthy();
    expect(screen.getByText(new RegExp(verse.text.slice(0, 24)))).toBeTruthy();
    expect(screen.getByRole('link', { name: new RegExp(verse.reference) })).toBeTruthy();
  });

  it('resolves and displays a verse when no cache exists', () => {
    render(<VerseOfTheDay date="2026-08-15" />);

    expect(screen.getByRole('heading', { name: 'Verse of the Day' })).toBeTruthy();
    const blockquote = document.querySelector('blockquote');
    expect(blockquote?.textContent?.length).toBeGreaterThan(10);
  });
});

describe('getVerseOfTheDay storage cache', () => {
  it('reads from localStorage when offline', () => {
    const date = '2026-09-01';
    const verse = VERSES[3];
    localStorage.setItem(
      VERSE_OF_DAY_CACHE_KEY,
      JSON.stringify({ date, verseId: verse.id }),
    );

    vi.stubGlobal('navigator', { onLine: false });
    expect(getVerseOfTheDay(date)).toEqual(verse);
  });
});
