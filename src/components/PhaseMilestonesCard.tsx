import { Link } from 'react-router-dom';
import { getPhaseMilestoneContext } from '../lib/milestones';
import { BadgeSprite } from './BadgeSprite';
import { Icon } from './Icon';

type Props = {
  phaseId: number;
  today: string;
};

export function PhaseMilestonesCard({ phaseId, today }: Props) {
  const ctx = getPhaseMilestoneContext(phaseId, today);
  if (!ctx) return null;

  const { phase, milestones, progressValue, metricLabel } = ctx;

  return (
    <section className="stitch-card p-stack-md" aria-label={`${phase.title} milestones`}>
      <div className="mb-stack-md flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-headline-md text-primary">
            Sacred Milestones
          </h3>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {phase.title} · {metricLabel}: {progressValue}
          </p>
        </div>
        <Icon name="military_tech" className="text-secondary" />
      </div>

      <div className="grid grid-cols-2 gap-gutter sm:grid-cols-4">
        {milestones.map((badge) => (
          <Link
            key={badge.id}
            to={`/progress/milestones/${badge.id}`}
            className={`rounded-xl border p-3 text-center transition-opacity hover:opacity-80 active:scale-[0.98] ${
              badge.earned
                ? 'border-secondary bg-secondary/10'
                : 'border-outline-variant/30 bg-surface-container-low'
            }`}
          >
            <BadgeSprite
              id={badge.id}
              earned={badge.earned}
              size={40}
              title={badge.title}
              className="mb-1"
            />
            <p className="text-body-md font-semibold text-primary">{badge.title}</p>
            <p className="mt-1 text-label-caps text-on-surface-variant">
              {badge.earned ? 'Earned' : `${Math.min(badge.current, badge.target)}/${badge.target}`}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
