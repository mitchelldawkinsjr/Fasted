import { Link } from 'react-router-dom';
import type { PhaseMilestoneDef } from '../data/phaseAchievements';
import { getNextReward } from '../lib/badges';
import { formatMilestoneDayLabel, getPhaseMilestoneContext } from '../lib/milestones';
import { getMilestoneTarget } from '../lib/phaseProgress';
import { Icon } from './Icon';

type Props = {
  phaseId: number;
  today: string;
};

function MilestoneLabel({
  tier,
  earned,
  inProgress,
}: {
  tier: PhaseMilestoneDef;
  earned: boolean;
  inProgress: boolean;
}) {
  const label = formatMilestoneDayLabel(tier.threshold);

  return (
    <Link
      to={`/progress/milestones/${tier.id}`}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-label-caps transition-opacity hover:opacity-80 active:scale-95 ${
        earned
          ? 'bg-secondary text-on-secondary'
          : inProgress
            ? 'bg-secondary/30 text-primary'
            : 'bg-surface-container text-on-surface-variant'
      }`}
      title={tier.title}
      aria-label={`${label}: ${tier.title}${earned ? ', earned' : ''}`}
    >
      {label}
      {earned && <Icon name="star" size={12} className="ml-0.5" filled />}
    </Link>
  );
}

export function MilestoneSection({ phaseId, today }: Props) {
  const ctx = getPhaseMilestoneContext(phaseId, today);
  if (!ctx) return null;

  const { phase, milestones, tierMilestones, progressValue, metricLabel } = ctx;
  const nextReward = getNextReward(phaseId, phase.startDate, phase.endDate, today);

  return (
    <div className="rounded-xl bg-surface-container-high/60 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label-caps text-on-surface">{metricLabel}</span>
        <span className="font-display text-body-md text-primary">{progressValue}</span>
      </div>
      {nextReward && (
        <p className="mt-1 text-label-caps text-on-surface">
          Next: {nextReward.title} ({nextReward.current}/{nextReward.target})
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
