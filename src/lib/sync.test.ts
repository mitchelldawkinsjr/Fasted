import { describe, expect, it } from 'vitest';
import { hasLocalProgress, mergeUserProgress } from './sync';
import type { UserProgress } from '../types';
import { FASTED_JOURNEY } from '../data/phaseTemplates';

function baseProgress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
    checkIns: [],
    checkInStreak: 0,
    journalEntries: [],
    mealImages: {},
    badges: [],
    settings: {
      reminderTime: '07:00',
      pushEnabled: false,
      theme: 'light',
      scriptureNote: '',
    },
    activeJourneyId: FASTED_JOURNEY.id,
    journeys: [FASTED_JOURNEY],
    ...overrides,
  };
}

describe('mergeUserProgress', () => {
  it('keeps guest journals that the account does not have', () => {
    const account = baseProgress({
      journalEntries: [
        {
          id: 'a1',
          type: 'prayer',
          date: '2026-07-01',
          content: 'account',
          updatedAt: '2026-07-01T10:00:00.000Z',
        },
      ],
    });
    const guest = baseProgress({
      journalEntries: [
        {
          id: 'g1',
          type: 'prayer',
          date: '2026-07-02',
          content: 'guest',
          updatedAt: '2026-07-02T10:00:00.000Z',
        },
      ],
      mealImages: { g1: { breakfast: ['img-1'] } },
    });

    const merged = mergeUserProgress(account, guest);
    expect(merged.journalEntries.map((e) => e.id).sort()).toEqual(['a1', 'g1']);
    expect(merged.mealImages.g1?.breakfast).toEqual(['img-1']);
  });

  it('prefers newer journal entry when ids collide', () => {
    const account = baseProgress({
      journalEntries: [
        {
          id: 'same',
          type: 'prayer',
          date: '2026-07-01',
          content: 'old',
          updatedAt: '2026-07-01T10:00:00.000Z',
        },
      ],
    });
    const guest = baseProgress({
      journalEntries: [
        {
          id: 'same',
          type: 'prayer',
          date: '2026-07-01',
          content: 'new',
          updatedAt: '2026-07-02T10:00:00.000Z',
        },
      ],
    });

    const merged = mergeUserProgress(account, guest);
    expect(merged.journalEntries).toHaveLength(1);
    expect(merged.journalEntries[0].type === 'prayer' && merged.journalEntries[0].content).toBe(
      'new',
    );
  });
});

describe('hasLocalProgress', () => {
  it('is false for empty progress', () => {
    expect(hasLocalProgress(baseProgress())).toBe(false);
  });

  it('is true when journals exist', () => {
    expect(
      hasLocalProgress(
        baseProgress({
          journalEntries: [
            {
              id: '1',
              type: 'prayer',
              date: '2026-07-01',
              content: 'hi',
              updatedAt: '2026-07-01T10:00:00.000Z',
            },
          ],
        }),
      ),
    ).toBe(true);
  });
});
