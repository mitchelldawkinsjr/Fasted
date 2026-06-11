import { getAllPlanDates } from './dateUtils';
import { getProgress } from './storage';

export function getCurrentStreak(today: string): number {
  const checkInDates = new Set(getProgress().checkIns.map((c) => c.date));
  const planDates = getAllPlanDates().filter((d) => d <= today).reverse();

  let streak = 0;
  for (const date of planDates) {
    if (checkInDates.has(date)) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

export function getLongestStreak(): number {
  const checkInDates = new Set(getProgress().checkIns.map((c) => c.date));
  const planDates = getAllPlanDates();

  let longest = 0;
  let current = 0;

  for (const date of planDates) {
    if (checkInDates.has(date)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

export function getTotalCheckIns(): number {
  return getProgress().checkIns.length;
}

export function getPhaseCompletionPercent(phaseStart: string, phaseEnd: string): number {
  const checkInDates = new Set(getProgress().checkIns.map((c) => c.date));
  const phaseDates = getAllPlanDates().filter(
    (d) => d >= phaseStart && d <= phaseEnd,
  );
  if (phaseDates.length === 0) return 0;
  const completed = phaseDates.filter((d) => checkInDates.has(d)).length;
  return Math.round((completed / phaseDates.length) * 100);
}
