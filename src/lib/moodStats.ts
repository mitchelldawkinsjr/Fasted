import { DAY_MOOD_OPTIONS } from './dayMood';
import { getPhaseDates } from './phaseProgress';
import { getProgress } from './storage';
import type { DayMood, DailyReflectionEntry } from '../types';
import { isDailyReflectionEntry } from './journalTags';

export type PhaseMoodCounts = Record<DayMood, number>;

export type PhaseMoodSummary = {
  counts: PhaseMoodCounts;
  total: number;
  uplifting: number;
  steady: number;
  difficult: number;
};

function emptyCounts(): PhaseMoodCounts {
  return {
    amazing: 0,
    good: 0,
    okay: 0,
    bad: 0,
    horrible: 0,
  };
}

export function getJournalEntriesWithMood(): DailyReflectionEntry[] {
  return getProgress().journalEntries.filter(
    (entry): entry is DailyReflectionEntry =>
      isDailyReflectionEntry(entry) && entry.dayMood != null,
  );
}

function buildMoodSummary(entries: DailyReflectionEntry[]): PhaseMoodSummary {
  const counts = emptyCounts();

  for (const entry of entries) {
    if (!entry.dayMood) continue;
    counts[entry.dayMood] += 1;
  }

  const uplifting = counts.amazing + counts.good;
  const steady = counts.okay;
  const difficult = counts.bad + counts.horrible;

  return {
    counts,
    total: uplifting + steady + difficult,
    uplifting,
    steady,
    difficult,
  };
}

export function getMonthMoodSummary(monthKey: string): PhaseMoodSummary {
  return buildMoodSummary(
    getJournalEntriesWithMood().filter((entry) => entry.date.startsWith(`${monthKey}-`)),
  );
}

export function getPhaseMoodSummary(
  phaseStart: string,
  phaseEnd: string,
  upToDate?: string,
): PhaseMoodSummary {
  const phaseDates = new Set(
    getPhaseDates(phaseStart, phaseEnd).filter((date) => !upToDate || date <= upToDate),
  );

  return buildMoodSummary(
    getJournalEntriesWithMood().filter((entry) => phaseDates.has(entry.date)),
  );
}

export function getPhaseMoodPercentages(summary: PhaseMoodSummary): Record<DayMood, number> {
  if (summary.total === 0) {
    return emptyCounts();
  }

  return DAY_MOOD_OPTIONS.reduce(
    (percentages, option) => {
      percentages[option.value] = Math.round((summary.counts[option.value] / summary.total) * 100);
      return percentages;
    },
    emptyCounts(),
  );
}
