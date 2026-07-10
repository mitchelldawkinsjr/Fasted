import type { UserProgress } from '../types';

export const EVENING_REMINDER_TIME: '20:00';

export const REMINDER_COPY: Record<
  'morning' | 'evening',
  { title: string; body: string; url: string }
>;

export function localDateInTimeZone(date: Date, timeZone: string): string;
export function localTimeInTimeZone(date: Date, timeZone: string): string;
export function hasCompletedCheckIn(
  progress: UserProgress | null | undefined,
  date: string,
): boolean;
export function hasDailyReflection(
  progress: UserProgress | null | undefined,
  date: string,
): boolean;

export function decideReminder(args: {
  now: Date;
  timeZone: string;
  reminderTime: string;
  lastMorningSentOn: string | null;
  lastEveningSentOn: string | null;
  progress: UserProgress | null | undefined;
}): {
  kind: 'morning' | 'evening';
  title: string;
  body: string;
  url: string;
  tag: string;
  localDate: string;
} | null;
