import { getPhaseMilestonesForPhase } from '../data/phaseAchievements';
import { getPhaseById } from '../data/fastingPlan';
import { getPhaseBadgeDefinitions } from '../lib/badges';
import { getMilestoneTarget } from '../lib/phaseProgress';
import { MilestoneLabel } from './MilestoneLabel';

type Props = {
  phaseId: number;
  today: string;
};

export function MilestoneSection({ phaseId, today }: Props) {
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
  const next = milestones.find((m) => !m.earned);

  return (
    <div className="rounded-xl bg-surface-container-high/60 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label-caps text-on-surface">{metricLabel}</span>
        <span className="font-display text-body-md text-primary">{progressValue}</span>
      </div>
      {next && (
        <p className="mt-1 text-label-caps text-on-surface">
          Next: {next.title} ({next.current}/{next.target})
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tierMilestones.map((tier) => {
          const badge = milestones.find((m) => m.id === tier.id);
          const earned = badge?.earned ?? false;
          const target =
            typeof tier.threshold === 'number'
              ? tier.threshold
              : getMilestoneTarget(tier, phase.startDate, phase.endDate);

          return (
            <MilestoneLabel
              key={tier.id}
              tier={tier}
              earned={earned}
              inProgress={!earned && progressValue >= target}
            />
          );
        })}
      </div>
    </div>
  );
}
