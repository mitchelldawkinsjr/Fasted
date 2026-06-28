import { FASTED_JOURNEY } from '../data/phaseTemplates';
import type { Journey } from '../types';
import { getProgress } from './storage';
import {
  clampToJourneyDate,
  getActiveJourney,
  getAllJourneyDates,
  getJourneyPlanEnd,
  isDateInJourney,
} from './journey';

export function getLocalDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDisplayDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getDayOfWeek(dateStr: string): number {
  return parseLocalDate(dateStr).getDay();
}

export function resolveJourney(journey?: Journey): Journey {
  if (journey) return journey;
  try {
    return getActiveJourney(getProgress());
  } catch {
    return FASTED_JOURNEY;
  }
}

export function isWithinPlan(dateStr: string, journey?: Journey): boolean {
  const active = resolveJourney(journey);
  return isDateInJourney(dateStr, active);
}

/** Keep journal/check-in dates inside the active journey window. */
export function clampDateToPlan(dateStr: string, journey?: Journey): string {
  return clampToJourneyDate(dateStr, resolveJourney(journey));
}

export function getDefaultJournalDate(
  today: string = getLocalDateString(),
  journey?: Journey,
): string {
  return clampDateToPlan(today, journey);
}

export function getAllPlanDates(journey?: Journey): string[] {
  return getAllJourneyDates(resolveJourney(journey));
}

export function getPlanEnd(journey?: Journey): string {
  return getJourneyPlanEnd(resolveJourney(journey));
}

export function getPlanStart(journey?: Journey): string {
  return resolveJourney(journey).startDate;
}

export function daysBetween(start: string, end: string): number {
  const ms = parseLocalDate(end).getTime() - parseLocalDate(start).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

export function getWeekIndexInPhase(dateStr: string, phaseStart: string): number {
  const days = daysBetween(phaseStart, dateStr) - 1;
  return Math.floor(days / 7);
}
