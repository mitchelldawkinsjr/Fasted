import type { Page } from '@playwright/test';
import { FASTED_JOURNEY } from '../../src/data/phaseTemplates';
import type { UserProgress } from '../../src/types';
import { FIXED_DATE, INSTALL_TOAST_KEY, LONG_TEXT, STORAGE_KEY, TOUR_DISMISSED } from './constants';

const DEFAULT_SETTINGS = {
  reminderTime: '07:00',
  theme: 'light' as const,
  scriptureNote:
    'Scripture text uses NLT (New Living Translation) wording where available. Some phases use a brief summary when multiple readings are assigned.',
};

function baseProgress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
    ...TOUR_DISMISSED,
    checkIns: [],
    checkInStreak: 0,
    journalEntries: [],
    mealImages: {},
    badges: [],
    settings: { ...DEFAULT_SETTINGS },
    activeJourneyId: FASTED_JOURNEY.id,
    journeys: [FASTED_JOURNEY],
    updatedAt: `${FIXED_DATE}T12:00:00.000Z`,
    ...overrides,
  };
}

export const SEED_STATES = {
  empty: baseProgress(),

  rich: baseProgress({
    checkInStreak: 3,
    checkIns: [
      {
        date: '2026-06-25',
        followedPlan: true,
        prayedFocus: true,
        readScripture: true,
        journaled: true,
        win: 'Stayed faithful with water only.',
        completedAt: '2026-06-25T20:00:00.000Z',
      },
      {
        date: '2026-06-26',
        followedPlan: true,
        prayedFocus: true,
        readScripture: true,
        journaled: true,
        win: 'Prayed through the midday hunger.',
        completedAt: '2026-06-26T20:00:00.000Z',
      },
    ],
    journalEntries: [
      {
        id: 'seed-reflection-1',
        type: 'daily-reflection',
        date: '2026-06-26',
        updatedAt: '2026-06-26T18:30:00.000Z',
        dayMood: 'good',
        prayerFocus: 'Steadfastness through the fast',
        prayedAbout: 'Prayed for grace and patience today.',
        godTeaching: 'God is meeting me in small obediences.',
        hungerNotes: 'Energy held steady through the afternoon.',
        victory: 'Chose water over distraction.',
        tomorrowIntention: 'Return to scripture before breakfast.',
      },
      {
        id: 'seed-prayer-1',
        type: 'prayer',
        date: '2026-06-25',
        updatedAt: '2026-06-25T18:30:00.000Z',
        content: 'Prayed for family healing and peace.',
      },
    ],
    settings: {
      ...DEFAULT_SETTINGS,
      scriptureNote: 'Rich seed data for visual and overflow tests.',
    },
  }),

  worstCase: baseProgress({
    checkIns: [
      {
        date: '2026-06-22',
        followedPlan: true,
        prayedFocus: true,
        readScripture: true,
        journaled: true,
        win: LONG_TEXT,
        completedAt: '2026-06-22T20:00:00.000Z',
      },
    ],
    journalEntries: [
      {
        id: 'overflow-test-1',
        type: 'daily-reflection',
        date: '2026-06-22',
        updatedAt: '2026-06-22T18:30:00.000Z',
        dayMood: 'amazing',
        prayerFocus: LONG_TEXT,
        prayedAbout: LONG_TEXT,
        godTeaching: LONG_TEXT,
        hungerNotes: LONG_TEXT,
        victory: LONG_TEXT,
        tomorrowIntention: LONG_TEXT,
      },
      {
        id: 'overflow-test-2',
        type: 'prayer',
        date: '2026-06-21',
        updatedAt: '2026-06-21T18:30:00.000Z',
        content: LONG_TEXT,
      },
    ],
    settings: {
      ...DEFAULT_SETTINGS,
      scriptureNote: LONG_TEXT,
    },
  }),

  streakReady: baseProgress({
    checkInStreak: 2,
    checkIns: [
      {
        date: '2026-06-25',
        followedPlan: true,
        prayedFocus: true,
        readScripture: true,
        journaled: true,
        win: 'Stayed faithful today.',
        completedAt: '2026-06-25T20:00:00.000Z',
      },
      {
        date: '2026-06-26',
        followedPlan: true,
        prayedFocus: true,
        readScripture: true,
        journaled: true,
        win: 'Stayed faithful today.',
        completedAt: '2026-06-26T20:00:00.000Z',
      },
    ],
  }),
} as const satisfies Record<string, UserProgress>;

export type SeedStateName = keyof typeof SEED_STATES;

export async function seedProgress(page: Page, state: SeedStateName = 'empty') {
  const progress = SEED_STATES[state];
  await page.addInitScript(
    ({ key, installKey, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(installKey, '1');
    },
    { key: STORAGE_KEY, installKey: INSTALL_TOAST_KEY, data: progress },
  );
}

export async function seedProgressOnPage(page: Page, state: SeedStateName = 'empty') {
  const progress = SEED_STATES[state];
  await page.evaluate(
    ({ key, installKey, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(installKey, '1');
    },
    { key: STORAGE_KEY, installKey: INSTALL_TOAST_KEY, data: progress },
  );
}
