import { getPhaseMilestonesForPhase } from '../data/phaseAchievements';
import { getPhaseById } from '../data/fastingPlan';
import { getPhaseBadgeDefinitions } from './badges';

export function getPhaseMilestoneContext(phaseId: number, today: string) {
  const phase = getPhaseById(phaseId);
  if (!phase) return null;

  const milestones = getPhaseBadgeDefinitions(phaseId, today);
  const tierMilestones = getPhaseMilestonesForPhase(phaseId).filter(
    (m) => m.threshold !== 'complete',
  );
  const progressMilestones = milestones.filter((m) =>
    tierMilestones.some((t) => t.id === m.id),
  );
  const primaryMetric = tierMilestones[0]?.metric ?? 'phase-check-ins';
  const progressValue = progressMilestones[0]?.current ?? 0;
  const metricLabel =
    primaryMetric === 'phase-fast-days' ? 'Fast days checked in' : 'Phase check-ins';

  return {
    phase,
    milestones,
    tierMilestones,
    progressValue,
    metricLabel,
  };
}
