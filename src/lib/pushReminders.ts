import type { UserProgress } from '../types';
import { EVENING_REMINDER_TIME } from './push';

export type ReminderKind = 'morning' | 'evening';

export type ReminderDecision = {
  kind: ReminderKind;
  title: string;
  body: string;
  url: string;
  tag: string;
};

/** Canonical copy for Web Push payloads and in-app DEV previews. */
export const REMINDER_COPY: Record<
  ReminderKind,
  { title: string; body: string; url: string }
> = {
  morning: {
    title: 'Fasted',
    body: 'Good morning — don’t forget to check your fast for today.',
    url: '/',
  },
  evening: {
    title: 'Fasted',
    body: 'Still time to check in and reflect on today’s fast.',
    url: '/',
  },
};

export function buildReminderDecision(kind: ReminderKind, localDate: string): ReminderDecision {
  const copy = REMINDER_COPY[kind];
  return {
    kind,
    title: copy.title,
    body: copy.body,
    url: copy.url,
    tag: `fasted-${kind}-${localDate}`,
  };
}

/** Local calendar date (YYYY-MM-DD) for an instant in a given IANA timezone. */
export function localDateInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Local HH:mm for an instant in a given IANA timezone. */
export function localTimeInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function hasCompletedCheckIn(progress: UserProgress | null | undefined, date: string): boolean {
  if (!progress?.checkIns?.length) return false;
  return progress.checkIns.some((c) => c.date === date && Boolean(c.completedAt));
}

export function hasDailyReflection(progress: UserProgress | null | undefined, date: string): boolean {
  if (!progress?.journalEntries?.length) return false;
  return progress.journalEntries.some(
    (entry) => entry.date === date && entry.type === 'daily-reflection',
  );
}

/**
 * Decide whether to send a reminder for this subscription at `now`.
 * Morning: at/after reminderTime if no check-in yet today.
 * Evening (20:00): if still no check-in and no daily reflection.
 */
export function decideReminder(args: {
  now: Date;
  timeZone: string;
  reminderTime: string;
  lastMorningSentOn: string | null;
  lastEveningSentOn: string | null;
  progress: UserProgress | null | undefined;
}): ReminderDecision | null {
  const { now, timeZone, reminderTime, lastMorningSentOn, lastEveningSentOn, progress } = args;
  const localDate = localDateInTimeZone(now, timeZone);
  const localTime = localTimeInTimeZone(now, timeZone);

  if (hasCompletedCheckIn(progress, localDate)) {
    return null;
  }

  if (localTime >= EVENING_REMINDER_TIME) {
    if (lastEveningSentOn === localDate) return null;
    if (hasDailyReflection(progress, localDate)) return null;
    return buildReminderDecision('evening', localDate);
  }

  if (localTime >= reminderTime) {
    if (lastMorningSentOn === localDate) return null;
    return buildReminderDecision('morning', localDate);
  }

  return null;
}
