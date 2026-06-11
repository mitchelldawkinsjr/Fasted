import { FAST_PHASES } from './fastingPlan';

export type AchievementMetric = 'phase-check-ins' | 'phase-fast-days';

export type PhaseMilestoneDef = {
  id: string;
  phaseId: number;
  threshold: number | 'complete';
  metric: AchievementMetric;
  title: string;
  description: string;
};

export type GlobalBadgeDef = {
  id: string;
  title: string;
  description: string;
  kind: 'check-ins' | 'streak' | 'prayer' | 'journal' | 'plan-finish';
  threshold: number;
};

/** Milestone tiers aligned with phase infographic artwork. */
export const PHASE_MILESTONES: PhaseMilestoneDef[] = [
  // Phase 1 — Daniel 1 Fast Pattern
  {
    id: 'phase-1-milestone-7',
    phaseId: 1,
    threshold: 7,
    metric: 'phase-check-ins',
    title: 'Week of Dedication',
    description: 'Seven faithful check-ins in Phase 1.',
  },
  {
    id: 'phase-1-milestone-14',
    phaseId: 1,
    threshold: 14,
    metric: 'phase-check-ins',
    title: 'Steadfast Heart',
    description: 'Fourteen faithful check-ins in Phase 1.',
  },
  {
    id: 'phase-1-complete',
    phaseId: 1,
    threshold: 'complete',
    metric: 'phase-check-ins',
    title: 'Phase 1 Complete',
    description: 'Finished the Daniel 1 Fast Pattern phase.',
  },

  // Phase 2 — David's Fast
  {
    id: 'phase-2-milestone-7',
    phaseId: 2,
    threshold: 7,
    metric: 'phase-check-ins',
    title: 'Seeking God',
    description: 'Seven faithful check-ins in Phase 2.',
  },
  {
    id: 'phase-2-milestone-14',
    phaseId: 2,
    threshold: 14,
    metric: 'phase-check-ins',
    title: 'Emotional Renewal',
    description: 'Fourteen faithful check-ins in Phase 2.',
  },
  {
    id: 'phase-2-milestone-21',
    phaseId: 2,
    threshold: 21,
    metric: 'phase-check-ins',
    title: 'Physical Discipline',
    description: 'Twenty-one faithful check-ins in Phase 2.',
  },
  {
    id: 'phase-2-complete',
    phaseId: 2,
    threshold: 'complete',
    metric: 'phase-check-ins',
    title: 'Phase 2 Complete',
    description: "Finished David's Fast for Seeking God.",
  },

  // Phase 3 — First Daniel Fast
  {
    id: 'phase-3-milestone-3',
    phaseId: 3,
    threshold: 3,
    metric: 'phase-check-ins',
    title: 'Keep Going',
    description: 'Three faithful days in the First Daniel Fast.',
  },
  {
    id: 'phase-3-milestone-7',
    phaseId: 3,
    threshold: 7,
    metric: 'phase-check-ins',
    title: 'Stay Strong',
    description: 'Seven faithful days in the First Daniel Fast.',
  },
  {
    id: 'phase-3-milestone-14',
    phaseId: 3,
    threshold: 14,
    metric: 'phase-check-ins',
    title: 'Breakthrough Path',
    description: 'Fourteen faithful days in the First Daniel Fast.',
  },
  {
    id: 'phase-3-milestone-21',
    phaseId: 3,
    threshold: 21,
    metric: 'phase-check-ins',
    title: 'Stay Faithful',
    description: 'Twenty-one faithful days—God honors consistency.',
  },

  // Phase 4 — Joel Repentance Fast
  {
    id: 'phase-4-milestone-3',
    phaseId: 4,
    threshold: 3,
    metric: 'phase-check-ins',
    title: 'Return to God',
    description: 'Three faithful check-ins in the Joel phase.',
  },
  {
    id: 'phase-4-milestone-5',
    phaseId: 4,
    threshold: 5,
    metric: 'phase-check-ins',
    title: 'Revival Seed',
    description: 'Five faithful check-ins in the Joel phase.',
  },
  {
    id: 'phase-4-milestone-7',
    phaseId: 4,
    threshold: 7,
    metric: 'phase-check-ins',
    title: 'God Honors Consistency',
    description: 'Seven faithful check-ins in the Joel phase.',
  },
  {
    id: 'phase-4-complete',
    phaseId: 4,
    threshold: 'complete',
    metric: 'phase-check-ins',
    title: 'Phase 4 Complete',
    description: 'Finished the Joel Repentance Fast.',
  },

  // Phase 5 — Isaiah 58 (milestone tiers match infographic; tracked via phase check-ins)
  {
    id: 'phase-5-milestone-3',
    phaseId: 5,
    threshold: 3,
    metric: 'phase-check-ins',
    title: '3 Fast Days',
    description: 'Three faithful days during the Isaiah 58 phase.',
  },
  {
    id: 'phase-5-milestone-7',
    phaseId: 5,
    threshold: 7,
    metric: 'phase-check-ins',
    title: '7 Fast Days',
    description: 'Seven faithful days during the Isaiah 58 phase.',
  },
  {
    id: 'phase-5-milestone-14',
    phaseId: 5,
    threshold: 14,
    metric: 'phase-check-ins',
    title: '14 Fast Days',
    description: 'Fourteen faithful days during the Isaiah 58 phase.',
  },
  {
    id: 'phase-5-milestone-21',
    phaseId: 5,
    threshold: 21,
    metric: 'phase-check-ins',
    title: 'Warrior of Purpose',
    description: 'Twenty-one faithful days of purpose-driven fasting.',
  },

  // Phase 6 — Second Daniel Fast
  {
    id: 'phase-6-milestone-3',
    phaseId: 6,
    threshold: 3,
    metric: 'phase-check-ins',
    title: 'Keep Going!',
    description: 'Three faithful days in the Second Daniel Fast.',
  },
  {
    id: 'phase-6-milestone-7',
    phaseId: 6,
    threshold: 7,
    metric: 'phase-check-ins',
    title: 'Strong!',
    description: 'Seven faithful days in the Second Daniel Fast.',
  },
  {
    id: 'phase-6-milestone-14',
    phaseId: 6,
    threshold: 14,
    metric: 'phase-check-ins',
    title: 'Unstoppable!',
    description: 'Fourteen faithful days in the Second Daniel Fast.',
  },
  {
    id: 'phase-6-milestone-21',
    phaseId: 6,
    threshold: 21,
    metric: 'phase-check-ins',
    title: 'Champion of Discipline',
    description: 'Twenty-one faithful days of transformation.',
  },

  // Phase 7 — Esther Preparation Fast
  {
    id: 'phase-7-milestone-3',
    phaseId: 7,
    threshold: 3,
    metric: 'phase-check-ins',
    title: 'Keep Going!',
    description: 'Three faithful days in the Esther phase.',
  },
  {
    id: 'phase-7-milestone-7',
    phaseId: 7,
    threshold: 7,
    metric: 'phase-check-ins',
    title: 'Strong and Faithful!',
    description: 'Seven faithful days in the Esther phase.',
  },
  {
    id: 'phase-7-milestone-14',
    phaseId: 7,
    threshold: 14,
    metric: 'phase-check-ins',
    title: "You're on Fire!",
    description: 'Fourteen faithful days in the Esther phase.',
  },
  {
    id: 'phase-7-milestone-21',
    phaseId: 7,
    threshold: 21,
    metric: 'phase-check-ins',
    title: 'Purpose Walk',
    description: 'Twenty-one faithful days—well done, good and faithful servant.',
  },

  // Phase 8 — Year-End Consecration
  {
    id: 'phase-8-milestone-7',
    phaseId: 8,
    threshold: 7,
    metric: 'phase-check-ins',
    title: '7 Day Faithful',
    description: 'Seven faithful days—great start!',
  },
  {
    id: 'phase-8-milestone-14',
    phaseId: 8,
    threshold: 14,
    metric: 'phase-check-ins',
    title: '14 Day Warrior',
    description: 'Fourteen faithful days—keep going!',
  },
  {
    id: 'phase-8-milestone-21',
    phaseId: 8,
    threshold: 21,
    metric: 'phase-check-ins',
    title: '21 Day Champion',
    description: 'Twenty-one faithful days—finish strong!',
  },
  {
    id: 'phase-8-complete',
    phaseId: 8,
    threshold: 'complete',
    metric: 'phase-check-ins',
    title: 'Consistent Faithful One',
    description: 'Completed the Year-End Consecration phase.',
  },
];

export const GLOBAL_BADGES: GlobalBadgeDef[] = [
  {
    id: 'first-check-in',
    title: 'First Check-In',
    description: 'Completed your first daily check-in.',
    kind: 'check-ins',
    threshold: 1,
  },
  {
    id: 'streak-3',
    title: '3-Day Streak',
    description: 'Checked in three plan days in a row.',
    kind: 'streak',
    threshold: 3,
  },
  {
    id: 'streak-7',
    title: '7-Day Streak',
    description: 'Checked in seven plan days in a row.',
    kind: 'streak',
    threshold: 7,
  },
  {
    id: 'streak-14',
    title: '14-Day Streak',
    description: 'Checked in fourteen plan days in a row.',
    kind: 'streak',
    threshold: 14,
  },
  {
    id: 'streak-21',
    title: '21-Day Streak',
    description: 'Checked in twenty-one plan days in a row.',
    kind: 'streak',
    threshold: 21,
  },
  {
    id: 'prayer-warrior',
    title: 'Prayer Warrior',
    description: 'Prayed over your focus on 10 check-ins.',
    kind: 'prayer',
    threshold: 10,
  },
  {
    id: 'journal-keeper',
    title: 'Journal Keeper',
    description: 'Wrote five journal entries.',
    kind: 'journal',
    threshold: 5,
  },
  {
    id: 'finished-plan',
    title: 'Finished the Plan',
    description: 'Completed the final day and stayed faithful through the closing phase.',
    kind: 'plan-finish',
    threshold: 21,
  },
];

export function getPhaseMilestonesForPhase(phaseId: number): PhaseMilestoneDef[] {
  return PHASE_MILESTONES.filter((m) => m.phaseId === phaseId);
}

export function getPhaseTitle(phaseId: number): string {
  return FAST_PHASES.find((p) => p.id === phaseId)?.title ?? `Phase ${phaseId}`;
}

/** Legacy badge IDs mapped to new equivalents for stored progress. */
export const LEGACY_BADGE_IDS: Record<string, string> = {
  'daniel-fast-complete': 'phase-3-milestone-21',
  'isaiah-58-servant': 'phase-5-milestone-21',
};
