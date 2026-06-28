import {
  GLOBAL_BADGES,
  LEGACY_BADGE_IDS,
  PHASE_MILESTONES,
  type GlobalBadgeDef,
  type PhaseMilestoneDef,
} from '../data/phaseAchievements';
import { getPhases } from '../data/fastingPlan';
import type { Badge, BadgeId } from '../types';
import { getDailyPlan } from './dailyPlan';
import { getAllPlanDates } from './dateUtils';
import {
  getMilestoneProgress,
  getMilestoneTarget,
  getNextPhaseMilestone,
  hasFinishedPlan,
  isMilestoneEarned,
} from './phaseProgress';
import { getProgress, saveBadges } from './storage';
import { getCurrentStreak } from './streaks';

export type BadgeProgress = {
  id: BadgeId;
  title: string;
  description: string;
  earnedAt?: string;
  phaseId?: number;
  current: number;
  target: number;
  earned: boolean;
};

function normalizeBadgeId(id: string): string {
  return LEGACY_BADGE_IDS[id] ?? id;
}

function buildPhaseBadge(milestone: PhaseMilestoneDef): Omit<Badge, 'earnedAt'> {
  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    phaseId: milestone.phaseId,
  };
}

function buildGlobalBadge(def: GlobalBadgeDef): Omit<Badge, 'earnedAt'> {
  return {
    id: def.id,
    title: def.title,
    description: def.description,
  };
}

function getEarnedBadgeMap(): Map<string, Badge> {
  const map = new Map<string, Badge>();
  for (const badge of getProgress().badges) {
    const id = normalizeBadgeId(badge.id);
    if (!map.has(id)) {
      map.set(id, { ...badge, id });
    }
  }
  return map;
}

function getPhaseByLegacyId(phaseId: number) {
  return getPhases().find((p) => p.id === phaseId);
}

function getGlobalBadgeProgress(def: GlobalBadgeDef, today: string): number {
  const progress = getProgress();

  switch (def.kind) {
    case 'check-ins':
      return progress.checkIns.length;
    case 'streak':
      return getCurrentStreak(today);
    case 'prayer':
      return progress.checkIns.filter((c) => c.prayedFocus).length;
    case 'journal':
      return progress.journalEntries.length;
    case 'plan-finish': {
      const phase8 = getPhaseByLegacyId(8);
      if (!phase8) return 0;
      return getMilestoneProgress(
        { id: 'phase-8-milestone-21', phaseId: 8, threshold: 21, metric: 'phase-check-ins', title: '', description: '' },
        phase8.startDate,
        phase8.endDate,
      );
    }
    default:
      return 0;
  }
}

function isGlobalBadgeEarned(def: GlobalBadgeDef, today: string): boolean {
  if (def.kind === 'plan-finish') {
    return hasFinishedPlan(today);
  }
  return getGlobalBadgeProgress(def, today) >= def.threshold;
}

export function getAllBadgeDefinitions(today: string): BadgeProgress[] {
  const earned = getEarnedBadgeMap();

  const globalBadges: BadgeProgress[] = GLOBAL_BADGES.map((def) => {
    const stored = earned.get(def.id);
    const current = getGlobalBadgeProgress(def, today);
    const autoEarned = isGlobalBadgeEarned(def, today);
    return {
      ...buildGlobalBadge(def),
      earnedAt: stored?.earnedAt ?? (autoEarned ? today : undefined),
      current,
      target: def.threshold,
      earned: Boolean(stored?.earnedAt) || autoEarned,
    };
  });

  const phaseBadges: BadgeProgress[] = PHASE_MILESTONES.flatMap((milestone) => {
    const phase = getPhaseByLegacyId(milestone.phaseId);
    if (!phase) return [];
    const stored = earned.get(milestone.id);
    const current = getMilestoneProgress(milestone, phase.startDate, phase.endDate);
    const target = getMilestoneTarget(milestone, phase.startDate, phase.endDate);
    const autoEarned = isMilestoneEarned(milestone, phase.startDate, phase.endDate);
    return [
      {
        ...buildPhaseBadge(milestone),
        earnedAt: stored?.earnedAt ?? (autoEarned ? today : undefined),
        current,
        target,
        earned: Boolean(stored?.earnedAt) || autoEarned,
      },
    ];
  });

  return [...globalBadges, ...phaseBadges];
}

export function getPhaseBadgeDefinitions(phaseId: number, today: string): BadgeProgress[] {
  return getAllBadgeDefinitions(today).filter((b) => b.phaseId === phaseId);
}

export function getNextReward(
  phaseId: number,
  phaseStart: string,
  phaseEnd: string,
  today: string,
): BadgeProgress | null {
  const nextPhase = getNextPhaseMilestone(phaseId, phaseStart, phaseEnd);
  if (nextPhase) {
    return {
      ...buildPhaseBadge(nextPhase.milestone),
      current: nextPhase.current,
      target: nextPhase.target,
      earned: false,
    };
  }

  const globalDefs = GLOBAL_BADGES.filter((g) => g.kind !== 'plan-finish');
  const earned = getEarnedBadgeMap();
  for (const def of globalDefs) {
    if (earned.get(def.id)?.earnedAt || isGlobalBadgeEarned(def, today)) continue;
    const current = getGlobalBadgeProgress(def, today);
    if (current < def.threshold) {
      return {
        ...buildGlobalBadge(def),
        current,
        target: def.threshold,
        earned: false,
      };
    }
  }

  return null;
}

function hasBadge(id: BadgeId): boolean {
  const normalized = normalizeBadgeId(id);
  return getProgress().badges.some((b) => normalizeBadgeId(b.id) === normalized);
}

function awardBadge(def: Omit<Badge, 'earnedAt'>, earnedAt: string): Badge | null {
  if (hasBadge(def.id)) return null;
  const badge: Badge = { ...def, earnedAt };
  const progress = getProgress();
  saveBadges([...progress.badges, badge]);
  return badge;
}

function migrateLegacyBadges(): void {
  const progress = getProgress();
  const existingIds = new Set(progress.badges.map((b) => normalizeBadgeId(b.id)));
  const migrated: Badge[] = [];
  let changed = false;

  for (const badge of progress.badges) {
    const mappedId = LEGACY_BADGE_IDS[badge.id];
    if (mappedId && !existingIds.has(mappedId)) {
      migrated.push({ ...badge, id: mappedId });
      changed = true;
    } else if (!mappedId) {
      migrated.push(badge);
    }
  }

  if (changed) saveBadges(migrated);
}

export function evaluateBadges(today: string): Badge[] {
  migrateLegacyBadges();
  const newlyEarned: Badge[] = [];

  const add = (def: Omit<Badge, 'earnedAt'>) => {
    const badge = awardBadge(def, today);
    if (badge) newlyEarned.push(badge);
  };

  for (const def of GLOBAL_BADGES) {
    if (isGlobalBadgeEarned(def, today)) {
      add(buildGlobalBadge(def));
    }
  }

  for (const milestone of PHASE_MILESTONES) {
    const phase = getPhaseByLegacyId(milestone.phaseId);
    if (!phase) continue;
    if (isMilestoneEarned(milestone, phase.startDate, phase.endDate)) {
      add(buildPhaseBadge(milestone));
    }
  }

  return newlyEarned;
}

export function getFastDaysCompleted(): number {
  const fastDays = getAllPlanDates().filter((d) => getDailyPlan(d)?.isFastDay);
  const checkInDates = new Set(getProgress().checkIns.map((c) => c.date));
  return fastDays.filter((d) => checkInDates.has(d)).length;
}

export function getPhasesCompletedCount(_today: string): number {
  const earned = getEarnedBadgeMap();
  return getPhases().filter((phase) => {
    const milestones = PHASE_MILESTONES.filter((m) => m.phaseId === phase.id);
    const finalMilestone = milestones[milestones.length - 1];
    if (!finalMilestone) return false;
    return (
      Boolean(earned.get(finalMilestone.id)?.earnedAt) ||
      isMilestoneEarned(finalMilestone, phase.startDate, phase.endDate)
    );
  }).length;
}

