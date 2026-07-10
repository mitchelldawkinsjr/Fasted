import { describe, expect, it } from 'vitest';
import type { UserProgress } from '../types';
import { FASTED_JOURNEY } from '../data/phaseTemplates';
import {
  decideReminder,
  hasCompletedCheckIn,
  hasDailyReflection,
  localDateInTimeZone,
  localTimeInTimeZone,
} from './pushReminders';

function progress(overrides: Partial<UserProgress> = {}): UserProgress {
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

describe('localDateInTimeZone / localTimeInTimeZone', () => {
  it('formats America/New_York correctly around UTC midnight', () => {
    // 2026-07-10 04:30 UTC = 2026-07-10 00:30 EDT
    const d = new Date('2026-07-10T04:30:00.000Z');
    expect(localDateInTimeZone(d, 'America/New_York')).toBe('2026-07-10');
    expect(localTimeInTimeZone(d, 'America/New_York')).toBe('00:30');
  });
});

describe('hasCompletedCheckIn / hasDailyReflection', () => {
  it('detects completed check-in and daily reflection', () => {
    const p = progress({
      checkIns: [
        {
          date: '2026-07-10',
          followedPlan: true,
          prayedFocus: true,
          readScripture: true,
          journaled: false,
          win: '',
          completedAt: '2026-07-10T12:00:00.000Z',
        },
      ],
      journalEntries: [
        {
          id: 'r1',
          type: 'daily-reflection',
          date: '2026-07-10',
          dayMood: 'good',
          prayerFocus: '',
          prayedAbout: '',
          godTeaching: '',
          hungerNotes: '',
          victory: '',
          tomorrowIntention: '',
          updatedAt: '2026-07-10T20:00:00.000Z',
        },
      ],
    });
    expect(hasCompletedCheckIn(p, '2026-07-10')).toBe(true);
    expect(hasDailyReflection(p, '2026-07-10')).toBe(true);
    expect(hasCompletedCheckIn(p, '2026-07-11')).toBe(false);
  });
});

describe('decideReminder', () => {
  const tz = 'America/New_York';

  it('sends morning at/after reminder time when no check-in', () => {
    // 2026-07-10 12:00 UTC = 08:00 EDT
    const decision = decideReminder({
      now: new Date('2026-07-10T12:00:00.000Z'),
      timeZone: tz,
      reminderTime: '07:00',
      lastMorningSentOn: null,
      lastEveningSentOn: null,
      progress: progress(),
    });
    expect(decision?.kind).toBe('morning');
  });

  it('skips morning if already sent today', () => {
    const decision = decideReminder({
      now: new Date('2026-07-10T12:00:00.000Z'),
      timeZone: tz,
      reminderTime: '07:00',
      lastMorningSentOn: '2026-07-10',
      lastEveningSentOn: null,
      progress: progress(),
    });
    expect(decision).toBeNull();
  });

  it('skips when check-in is completed', () => {
    const decision = decideReminder({
      now: new Date('2026-07-10T12:00:00.000Z'),
      timeZone: tz,
      reminderTime: '07:00',
      lastMorningSentOn: null,
      lastEveningSentOn: null,
      progress: progress({
        checkIns: [
          {
            date: '2026-07-10',
            followedPlan: true,
            prayedFocus: true,
            readScripture: true,
            journaled: false,
            win: '',
            completedAt: '2026-07-10T11:00:00.000Z',
          },
        ],
      }),
    });
    expect(decision).toBeNull();
  });

  it('sends evening at/after 20:00 when no check-in and no reflection', () => {
    // 2026-07-11 00:30 UTC = 2026-07-10 20:30 EDT
    const decision = decideReminder({
      now: new Date('2026-07-11T00:30:00.000Z'),
      timeZone: tz,
      reminderTime: '07:00',
      lastMorningSentOn: '2026-07-10',
      lastEveningSentOn: null,
      progress: progress(),
    });
    expect(decision?.kind).toBe('evening');
  });

  it('skips evening when daily reflection exists even without check-in', () => {
    const decision = decideReminder({
      now: new Date('2026-07-11T00:30:00.000Z'),
      timeZone: tz,
      reminderTime: '07:00',
      lastMorningSentOn: '2026-07-10',
      lastEveningSentOn: null,
      progress: progress({
        journalEntries: [
          {
            id: 'r1',
            type: 'daily-reflection',
            date: '2026-07-10',
            dayMood: 'good',
            prayerFocus: '',
            prayedAbout: '',
            godTeaching: 'notes',
            hungerNotes: '',
            victory: '',
            tomorrowIntention: '',
            updatedAt: '2026-07-10T21:00:00.000Z',
          },
        ],
      }),
    });
    expect(decision).toBeNull();
  });

  it('does not send before morning reminder time', () => {
    // 2026-07-10 10:00 UTC = 06:00 EDT
    const decision = decideReminder({
      now: new Date('2026-07-10T10:00:00.000Z'),
      timeZone: tz,
      reminderTime: '07:00',
      lastMorningSentOn: null,
      lastEveningSentOn: null,
      progress: progress(),
    });
    expect(decision).toBeNull();
  });
});
