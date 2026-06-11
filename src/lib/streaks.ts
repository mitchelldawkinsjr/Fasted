import { getDailyPlan } from './dailyPlan';
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

/** Consecutive plan-day check-ins ending on or before `today`. */
export function getCurrentCheckInStreak(today: string): number {
  return getCurrentStreak(today);
}

/** Total check-ins recorded within a phase (not necessarily consecutive). */
export function getPhaseCheckInTotal(phaseStart: string, phaseEnd: string): number {
  const checkInDates = new Set(getProgress().checkIns.map((c) => c.date));
  const phaseDates = getAllPlanDates().filter(
    (d) => d >= phaseStart && d <= phaseEnd,
  );
  return phaseDates.filter((d) => checkInDates.has(d)).length;
}

/** Fast days in a phase where the user checked in. */
export function getPhaseFastDayTotal(phaseStart: string, phaseEnd: string): number {
  const checkInDates = new Set(getProgress().checkIns.map((c) => c.date));
  const phaseDates = getAllPlanDates().filter(
    (d) => d >= phaseStart && d <= phaseEnd,
  );
  return phaseDates.filter((d) => {
    const plan = getDailyPlan(d);
    return plan?.isFastDay && checkInDates.has(d);
  }).length;
}

export function getPhaseDayCount(phaseStart: string, phaseEnd: string): number {
  return getAllPlanDates().filter((d) => d >= phaseStart && d <= phaseEnd).length;
}
