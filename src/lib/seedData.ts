import { PLAN_START } from '../data/fastingPlan';
import { getLocalDateString, parseLocalDate } from './dateUtils';
import { GUEST_STORAGE_KEY } from './storage';
import type { CheckIn, DailyReflectionEntry, DayMood, UserProgress } from '../types';

const MOOD_CYCLE: DayMood[] = ['good', 'amazing', 'okay', 'good', 'bad', 'okay', 'amazing', 'good', 'horrible', 'okay'];

function addDays(dateStr: string, days: number): string {
  const next = parseLocalDate(dateStr);
  next.setDate(next.getDate() + days);
  return getLocalDateString(next);
}

function buildDailyReflection(date: string, mood: DayMood, index: number): DailyReflectionEntry {
  const updatedAt = `${date}T18:30:00.000Z`;
  return {
    id: `seed-reflection-${date}`,
    type: 'daily-reflection',
    date,
    updatedAt,
    dayMood: mood,
    prayerFocus: 'Steadfastness through the fast',
    prayedAbout: `Prayed for grace on day ${index + 1} of this season.`,
    godTeaching: 'God is meeting me in small obediences.',
    hungerNotes: index % 3 === 0 ? 'Felt hunger during the midday window.' : 'Energy held steady.',
    victory: index % 2 === 0 ? 'Stayed present in prayer.' : 'Chose water over distraction.',
    tomorrowIntention: 'Return to scripture before breakfast.',
  };
}

function buildCheckIn(date: string): CheckIn {
  return {
    date,
    followedPlan: true,
    prayedFocus: true,
    readScripture: true,
    journaled: true,
    win: 'Showed up with honesty.',
    completedAt: `${date}T20:00:00.000Z`,
  };
}

function buildSeedProgress(endDate: string = getLocalDateString()): UserProgress {
  const journalEntries: DailyReflectionEntry[] = [];
  const checkIns: CheckIn[] = [];
  let cursor = PLAN_START;
  let index = 0;

  while (cursor <= endDate) {
    const mood = MOOD_CYCLE[index % MOOD_CYCLE.length];
    journalEntries.push(buildDailyReflection(cursor, mood, index));
    checkIns.push(buildCheckIn(cursor));
    cursor = addDays(cursor, 1);
    index += 1;
  }

  return {
    checkIns,
    journalEntries,
    badges: [],
    settings: {
      reminderTime: '07:00',
      theme: 'light',
      scriptureNote:
        'Scripture text uses NLT (New Living Translation) wording where available. Some phases use a brief summary when multiple readings are assigned.',
    },
    updatedAt: new Date().toISOString(),
  };
}

/** Dev-only: replace guest localStorage with seeded progress for UI testing. */
export function applyDevSeedIfRequested(): void {
  if (!import.meta.env.DEV || import.meta.env.VITE_SEED_DATA !== 'true') return;
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(buildSeedProgress()));
}
