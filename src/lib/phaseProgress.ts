import type { PhaseMilestoneDef } from '../data/phaseAchievements';
import { getPhaseMilestonesForPhase } from '../data/phaseAchievements';
import { getDailyPlan } from './dailyPlan';
import { getAllPlanDates, getPlanEnd } from './dateUtils';
import { getActiveJourney, getJourneyPhaseWindows } from './journey';
import { getProgress } from './storage';

export function getPhaseDates(startDate: string, endDate: string): string[] {
  return getAllPlanDates().filter((d) => d >= startDate && d <= endDate);
}

export function getPhaseCheckInCount(startDate: string, endDate: string): number {
  const phaseDates = new Set(getAllPlanDates().filter((d) => d >= startDate && d <= endDate));
  return getProgress().checkIns.filter((c) => phaseDates.has(c.date)).length;
}

export function getPhaseFastDayCheckInCount(startDate: string, endDate: string): number {
  const phaseDates = getAllPlanDates().filter((d) => d >= startDate && d <= endDate);
  const checkInDates = new Set(getProgress().checkIns.map((c) => c.date));
  return phaseDates.filter((d) => {
    const plan = getDailyPlan(d);
    return plan?.isFastDay && checkInDates.has(d);
  }).length;
}

export function getMilestoneTarget(
  milestone: PhaseMilestoneDef,
  phaseStart: string,
  phaseEnd: string,
): number {
  if (milestone.threshold === 'complete') {
    return getPhaseDates(phaseStart, phaseEnd).length;
  }
  return milestone.threshold;
}

export function getMilestoneProgress(
  milestone: PhaseMilestoneDef,
  phaseStart: string,
  phaseEnd: string,
): number {
  if (milestone.metric === 'phase-fast-days') {
    return getPhaseFastDayCheckInCount(phaseStart, phaseEnd);
  }
  return getPhaseCheckInCount(phaseStart, phaseEnd);
}

export function isMilestoneEarned(
  milestone: PhaseMilestoneDef,
  phaseStart: string,
  phaseEnd: string,
): boolean {
  const target = getMilestoneTarget(milestone, phaseStart, phaseEnd);
  return getMilestoneProgress(milestone, phaseStart, phaseEnd) >= target;
}

export function getNextPhaseMilestone(
  phaseId: number,
  phaseStart: string,
  phaseEnd: string,
): { milestone: PhaseMilestoneDef; current: number; target: number } | null {
  const milestones = getPhaseMilestonesForPhase(phaseId);
  const earnedIds = new Set(getProgress().badges.map((b) => b.id));

  for (const milestone of milestones) {
    if (earnedIds.has(milestone.id)) continue;
    const target = getMilestoneTarget(milestone, phaseStart, phaseEnd);
    const current = getMilestoneProgress(milestone, phaseStart, phaseEnd);
    if (current < target) {
      return { milestone, current, target };
    }
  }

  return null;
}

export function hasFinishedPlan(today: string): boolean {
  const progress = getProgress();
  const journey = getActiveJourney(progress);
  const planEnd = getPlanEnd(journey);
  const checkedFinalDay = progress.checkIns.some((c) => c.date === planEnd);
  if (today < planEnd || !checkedFinalDay) return false;

  const windows = getJourneyPhaseWindows(journey);
  const last = windows[windows.length - 1];
  if (!last) return false;

  const lastPhaseCheckIns = getPhaseCheckInCount(last.startDate, last.endDate);
  return lastPhaseCheckIns >= getPhaseDates(last.startDate, last.endDate).length;
}
