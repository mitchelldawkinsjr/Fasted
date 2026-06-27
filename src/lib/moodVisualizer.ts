import { getPlanEnd, getPlanStart, parseLocalDate } from './dateUtils';
import { DAY_MOOD_OPTIONS, getDayMoodOption } from './dayMood';
import { getJournalEntriesWithMood } from './moodStats';
import type { DayMood } from '../types';

export type MoodDayEntry = {
  date: string;
  mood: DayMood;
  color: string;
  label: string;
};

const MOOD_SCORE: Record<DayMood, number> = {
  amazing: 5,
  good: 4,
  okay: 3,
  bad: 2,
  horrible: 1,
};

export function getMoodEntries(): MoodDayEntry[] {
  return getJournalEntriesWithMood()
    .map((entry) => {
      const mood = entry.dayMood!;
      const option = getDayMoodOption(mood);
      return {
        date: entry.date,
        mood,
        color: option.color,
        label: option.label,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getMoodByDate(): Map<string, MoodDayEntry> {
  return new Map(getMoodEntries().map((entry) => [entry.date, entry]));
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function formatDateInMonth(monthKey: string, day: number): string {
  return `${monthKey}-${String(day).padStart(2, '0')}`;
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [year, month] = key.split('-').map(Number);
  return { year, month };
}

export function formatMonthLabel(key: string): string {
  return parseLocalDate(`${key}-01`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function getPlanMonths(): string[] {
  const months: string[] = [];
  const start = parseLocalDate(getPlanStart());
  const end = parseLocalDate(getPlanEnd());
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cursor <= end) {
    months.push(toMonthKey(cursor.getFullYear(), cursor.getMonth() + 1));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

export function clampMonthKey(key: string): string {
  const months = getPlanMonths();
  if (months.length === 0) return key;
  if (key < months[0]) return months[0];
  if (key > months[months.length - 1]) return months[months.length - 1];
  return months.includes(key) ? key : months[0];
}

export function getMoodEntriesForMonth(monthKey: string): Map<number, MoodDayEntry> {
  const { year, month } = parseMonthKey(monthKey);
  const prefix = `${monthKey}-`;
  const byDay = new Map<number, MoodDayEntry>();

  for (const entry of getMoodEntries()) {
    if (!entry.date.startsWith(prefix)) continue;
    const day = Number(entry.date.slice(8, 10));
    if (day >= 1 && day <= getDaysInMonth(year, month)) {
      byDay.set(day, entry);
    }
  }

  return byDay;
}

export function getMonthEntryStats(monthKey: string): { total: number; daysInMonth: number } {
  const { year, month } = parseMonthKey(monthKey);
  const entries = getMoodEntriesForMonth(monthKey);
  return {
    total: entries.size,
    daysInMonth: getDaysInMonth(year, month),
  };
}

function getAverageMoodLabel(entries: MoodDayEntry[]): string {
  if (entries.length === 0) return '—';

  const average =
    entries.reduce((sum, entry) => sum + MOOD_SCORE[entry.mood], 0) / entries.length;

  const closest = DAY_MOOD_OPTIONS.reduce((best, option) => {
    const distance = Math.abs(MOOD_SCORE[option.value] - average);
    const bestDistance = Math.abs(MOOD_SCORE[best.value] - average);
    return distance < bestDistance ? option : best;
  });

  return closest.label;
}

export function getAverageMoodLabelForMonth(monthKey: string): string {
  return getAverageMoodLabel([...getMoodEntriesForMonth(monthKey).values()]);
}

export function getAverageMoodLabelForAll(): string {
  return getAverageMoodLabel(getMoodEntries());
}

export function describeAnnularSegment(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  index: number,
  count: number,
): string {
  const startAngle = (index * (360 / count)) - 90;
  const endAngle = ((index + 1) * (360 / count)) - 90;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const x1 = cx + innerR * Math.cos(toRad(startAngle));
  const y1 = cy + innerR * Math.sin(toRad(startAngle));
  const x2 = cx + innerR * Math.cos(toRad(endAngle));
  const y2 = cy + innerR * Math.sin(toRad(endAngle));
  const x3 = cx + outerR * Math.cos(toRad(endAngle));
  const y3 = cy + outerR * Math.sin(toRad(endAngle));
  const x4 = cx + outerR * Math.cos(toRad(startAngle));
  const y4 = cy + outerR * Math.sin(toRad(startAngle));

  return `M ${x1} ${y1} A ${innerR} ${innerR} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${outerR} ${outerR} 0 0 0 ${x4} ${y4} Z`;
}

export function describeDayLabelPosition(
  cx: number,
  cy: number,
  radius: number,
  index: number,
  count: number,
): { x: number; y: number; rotation: number } {
  const angle = (index * (360 / count)) + (180 / count) - 90;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const x = cx + radius * Math.cos(toRad(angle));
  const y = cy + radius * Math.sin(toRad(angle));
  return { x, y, rotation: angle + 90 };
}
