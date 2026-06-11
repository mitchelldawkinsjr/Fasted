import { PLAN_END, PLAN_START } from '../data/fastingPlan';

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

export function isWednesday(dateStr: string): boolean {
  return getDayOfWeek(dateStr) === 3;
}

export function isMonday(dateStr: string): boolean {
  return getDayOfWeek(dateStr) === 1;
}

export function isThursday(dateStr: string): boolean {
  return getDayOfWeek(dateStr) === 4;
}

export function isFriday(dateStr: string): boolean {
  return getDayOfWeek(dateStr) === 5;
}

export function isSaturday(dateStr: string): boolean {
  return getDayOfWeek(dateStr) === 6;
}

export function isSunday(dateStr: string): boolean {
  return getDayOfWeek(dateStr) === 0;
}

export function isWithinPlan(dateStr: string): boolean {
  return dateStr >= PLAN_START && dateStr <= PLAN_END;
}

export function getAllPlanDates(): string[] {
  const dates: string[] = [];
  const current = parseLocalDate(PLAN_START);
  const end = parseLocalDate(PLAN_END);

  while (current <= end) {
    dates.push(getLocalDateString(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export function daysBetween(start: string, end: string): number {
  const ms = parseLocalDate(end).getTime() - parseLocalDate(start).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

export function getWeekIndexInPhase(dateStr: string, phaseStart: string): number {
  const days = daysBetween(phaseStart, dateStr) - 1;
  return Math.floor(days / 7);
}
