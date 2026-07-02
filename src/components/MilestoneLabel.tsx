import { Link } from 'react-router-dom';
import type { PhaseMilestoneDef } from '../data/phaseAchievements';
import { Icon } from './Icon';

type Props = {
  tier: PhaseMilestoneDef;
  earned: boolean;
  inProgress: boolean;
};

export function formatMilestoneDayLabel(threshold: number | 'complete'): string {
  if (threshold === 'complete') return 'Complete';
  return `Day ${threshold}`;
}

export function MilestoneLabel({ tier, earned, inProgress }: Props) {
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
