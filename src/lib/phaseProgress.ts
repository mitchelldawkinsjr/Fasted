import { PLAN_END } from '../data/fastingPlan';
import type { PhaseMilestoneDef } from '../data/phaseAchievements';
import { getPhaseMilestonesForPhase } from '../data/phaseAchievements';
import { getDailyPlan } from './dailyPlan';
import { getAllPlanDates } from './dateUtils';
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

export function getPhaseCheckInCountUpTo(
  phaseStart: string,
  phaseEnd: string,
  today: string,
): number {
  const phaseDates = new Set(
    getAllPlanDates().filter((d) => d >= phaseStart && d <= phaseEnd && d <= today),
  );
  return getProgress().checkIns.filter((c) => phaseDates.has(c.date)).length;
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
  const checkedFinalDay = progress.checkIns.some((c) => c.date === PLAN_END);
  if (today < PLAN_END || !checkedFinalDay) return false;

  const phase8Start = '2026-11-29';
  const phase8End = PLAN_END;
  const phase8CheckIns = getPhaseCheckInCount(phase8Start, phase8End);
  return phase8CheckIns >= 21;
}
