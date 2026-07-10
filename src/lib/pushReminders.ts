import type { UserProgress } from '../types';
import {
  decideReminder as decideReminderShared,
  EVENING_REMINDER_TIME,
  hasCompletedCheckIn as hasCompletedCheckInShared,
  hasDailyReflection as hasDailyReflectionShared,
  localDateInTimeZone as localDateInTimeZoneShared,
  localTimeInTimeZone as localTimeInTimeZoneShared,
  REMINDER_COPY as REMINDER_COPY_SHARED,
} from './pushReminders.shared.js';

export { EVENING_REMINDER_TIME };

export type ReminderKind = 'morning' | 'evening';

export type ReminderDecision = {
  kind: ReminderKind;
  title: string;
  body: string;
  url: string;
  tag: string;
  localDate: string;
};

export const REMINDER_COPY: Record<
  ReminderKind,
  { title: string; body: string; url: string }
> = REMINDER_COPY_SHARED;

export const localDateInTimeZone = localDateInTimeZoneShared as (
  date: Date,
  timeZone: string,
) => string;

export const localTimeInTimeZone = localTimeInTimeZoneShared as (
  date: Date,
  timeZone: string,
) => string;

export const hasCompletedCheckIn = hasCompletedCheckInShared as (
  progress: UserProgress | null | undefined,
  date: string,
) => boolean;

export const hasDailyReflection = hasDailyReflectionShared as (
  progress: UserProgress | null | undefined,
  date: string,
) => boolean;

export function decideReminder(args: {
  now: Date;
  timeZone: string;
  reminderTime: string;
  lastMorningSentOn: string | null;
  lastEveningSentOn: string | null;
  progress: UserProgress | null | undefined;
}): ReminderDecision | null {
  return decideReminderShared(args) as ReminderDecision | null;
}
