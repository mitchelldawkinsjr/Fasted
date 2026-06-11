import { FAST_PHASES } from '../data/fastingPlan';
import type { Badge, BadgeId } from '../types';
import { getDailyPlan } from './dailyPlan';
import { getAllPlanDates } from './dateUtils';
import { getProgress, saveBadges } from './storage';
import { getCurrentStreak } from './streaks';

const BADGE_DEFINITIONS: Record<BadgeId, Omit<Badge, 'earnedAt'>> = {
  'first-check-in': {
    id: 'first-check-in',
    title: 'First Check-In',
    description: 'Completed your first daily check-in.',
  },
  'streak-3': {
    id: 'streak-3',
    title: '3-Day Streak',
    description: 'Checked in three days in a row.',
  },
  'streak-7': {
    id: 'streak-7',
    title: '7-Day Streak',
    description: 'Checked in seven days in a row.',
  },
  'phase-1-complete': {
    id: 'phase-1-complete',
    title: 'Phase 1 Complete',
    description: 'Finished the Daniel 1 Fast Pattern phase.',
  },
  'daniel-fast-complete': {
    id: 'daniel-fast-complete',
    title: 'Daniel Fast Complete',
    description: 'Completed a full Daniel Fast phase.',
  },
  'prayer-warrior': {
    id: 'prayer-warrior',
    title: 'Prayer Warrior',
    description: 'Prayed over your focus on 10 check-ins.',
  },
  'journal-keeper': {
    id: 'journal-keeper',
    title: 'Journal Keeper',
    description: 'Wrote five journal entries.',
  },
  'isaiah-58-servant': {
    id: 'isaiah-58-servant',
    title: 'Isaiah 58 Servant',
    description: 'Completed check-ins during the Isaiah 58 phase.',
  },
  'finished-plan': {
    id: 'finished-plan',
    title: 'Finished the Plan',
    description: 'Reached the end of the fasting calendar.',
  },
};

export function getAllBadgeDefinitions(): Badge[] {
  const earned = new Map(getProgress().badges.map((b) => [b.id, b]));
  return (Object.keys(BADGE_DEFINITIONS) as BadgeId[]).map((id) => ({
    ...BADGE_DEFINITIONS[id],
    earnedAt: earned.get(id)?.earnedAt,
  }));
}

function hasBadge(id: BadgeId): boolean {
  return getProgress().badges.some((b) => b.id === id);
}

function awardBadge(id: BadgeId, earnedAt: string): Badge | null {
  if (hasBadge(id)) return null;
  const badge: Badge = { ...BADGE_DEFINITIONS[id], earnedAt };
  const progress = getProgress();
  saveBadges([...progress.badges, badge]);
  return badge;
}

export function evaluateBadges(today: string): Badge[] {
  const progress = getProgress();
  const newlyEarned: Badge[] = [];

  const add = (id: BadgeId) => {
    const badge = awardBadge(id, today);
    if (badge) newlyEarned.push(badge);
  };

  if (progress.checkIns.length >= 1) add('first-check-in');

  const streak = getCurrentStreak(today);
  if (streak >= 3) add('streak-3');
  if (streak >= 7) add('streak-7');

  const prayedCount = progress.checkIns.filter((c) => c.prayedFocus).length;
  if (prayedCount >= 10) add('prayer-warrior');

  if (progress.journalEntries.length >= 5) add('journal-keeper');

  const phase1 = FAST_PHASES[0];
  const phase1Dates = getAllPlanDates().filter(
    (d) => d >= phase1.startDate && d <= phase1.endDate,
  );
  const phase1CheckIns = progress.checkIns.filter((c) =>
    phase1Dates.includes(c.date),
  );
  if (phase1CheckIns.length >= phase1Dates.length) add('phase-1-complete');

  const danielPhases = [3, 6];
  for (const phaseId of danielPhases) {
    const phase = FAST_PHASES.find((p) => p.id === phaseId)!;
    const phaseDates = getAllPlanDates().filter(
      (d) => d >= phase.startDate && d <= phase.endDate,
    );
    const phaseCheckIns = progress.checkIns.filter((c) =>
      phaseDates.includes(c.date),
    );
    if (phaseCheckIns.length >= phaseDates.length) {
      add('daniel-fast-complete');
      break;
    }
  }

  const isaiahPhase = FAST_PHASES.find((p) => p.id === 5)!;
  const isaiahDates = getAllPlanDates().filter(
    (d) => d >= isaiahPhase.startDate && d <= isaiahPhase.endDate,
  );
  const isaiahCheckIns = progress.checkIns.filter((c) =>
    isaiahDates.includes(c.date),
  );
  if (isaiahCheckIns.length >= isaiahDates.length) add('isaiah-58-servant');

  if (today >= '2026-12-19' && progress.checkIns.some((c) => c.date === '2026-12-19')) {
    add('finished-plan');
  }

  return newlyEarned;
}

export function getFastDaysCompleted(): number {
  const fastDays = getAllPlanDates().filter((d) => getDailyPlan(d)?.isFastDay);
  const checkInDates = new Set(getProgress().checkIns.map((c) => c.date));
  return fastDays.filter((d) => checkInDates.has(d)).length;
}
