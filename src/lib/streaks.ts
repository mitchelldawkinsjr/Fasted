import type { CheckIn } from '../types';
import { getAllPlanDates } from './dateUtils';
import { getPhaseCheckInCount, getPhaseDates } from './phaseProgress';
import { getProgress } from './storage';

function countConsecutiveFrom(
  startDate: string,
  planDatesDescending: string[],
  checkInDates: Set<string>,
): number {
  let streak = 0;
  let counting = false;

  for (const date of planDatesDescending) {
    if (date === startDate) counting = true;
    if (!counting) continue;
    if (checkInDates.has(date)) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Compute the visible check-in streak for a given day.
 * Before today's check-in, shows the streak carried over from the prior plan day.
 * Returns 0 when the user missed a plan day (real gap in check-ins).
 */
export function computeCheckInStreak(checkIns: CheckIn[], today: string): number {
  const checkInDates = new Set(checkIns.map((c) => c.date));
  const planDatesUpToToday = getAllPlanDates().filter((d) => d <= today);

  if (planDatesUpToToday.length === 0) return 0;

  const planDatesDescending = [...planDatesUpToToday].reverse();

  if (checkInDates.has(today)) {
    return countConsecutiveFrom(today, planDatesDescending, checkInDates);
  }

  const priorPlanDates = planDatesUpToToday.filter((d) => d < today);
  if (priorPlanDates.length === 0) return 0;

  const lastPriorDate = priorPlanDates[priorPlanDates.length - 1];
  if (!checkInDates.has(lastPriorDate)) return 0;

  return countConsecutiveFrom(lastPriorDate, planDatesDescending, checkInDates);
}

export function getCurrentStreak(today: string): number {
  return computeCheckInStreak(getProgress().checkIns, today);
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
  const phaseDates = getPhaseDates(phaseStart, phaseEnd);
  if (phaseDates.length === 0) return 0;
  const completed = getPhaseCheckInCount(phaseStart, phaseEnd);
  return Math.round((completed / phaseDates.length) * 100);
}
