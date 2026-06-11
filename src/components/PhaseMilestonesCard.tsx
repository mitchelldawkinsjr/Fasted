import { getPhaseMilestonesForPhase } from '../data/phaseAchievements';
import { getPhaseById } from '../data/fastingPlan';
import { getPhaseBadgeDefinitions } from '../lib/badges';
import { getMilestoneTarget } from '../lib/phaseProgress';
import { Icon } from './Icon';

type Props = {
  phaseId: number;
  today: string;
  compact?: boolean;
};

export function PhaseMilestonesCard({ phaseId, today, compact = false }: Props) {
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

  if (compact) {
    const next = milestones.find((m) => !m.earned);
    return (
      <div className="rounded-xl bg-surface-container-high/60 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label-caps text-on-surface-variant">{metricLabel}</span>
          <span className="font-display text-body-md text-primary">{progressValue}</span>
        </div>
        {next && (
          <p className="mt-1 text-label-caps text-on-surface-variant">
            Next: {next.title} ({next.current}/{next.target})
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tierMilestones.map((tier) => {
            const badge = milestones.find((m) => m.id === tier.id);
            const earned = badge?.earned;
            const target =
              typeof tier.threshold === 'number'
                ? tier.threshold
                : getMilestoneTarget(tier, phase.startDate, phase.endDate);
            return (
              <span
                key={tier.id}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-label-caps ${
                  earned
                    ? 'bg-secondary text-on-secondary'
                    : progressValue >= target
                      ? 'bg-secondary/30 text-primary'
                      : 'bg-surface-container text-on-surface-variant'
                }`}
                title={tier.title}
              >
                {typeof tier.threshold === 'number' ? tier.threshold : '✓'}
                {earned && <Icon name="star" size={12} className="ml-0.5" filled />}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section className="stitch-card p-stack-md" aria-labelledby={`phase-${phaseId}-milestones`}>
      <div className="mb-stack-md flex items-start justify-between gap-3">
        <div>
          <h3 id={`phase-${phaseId}-milestones`} className="font-display text-headline-md text-primary">
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
          <div
            key={badge.id}
            className={`rounded-xl border p-3 text-center ${
              badge.earned
                ? 'border-secondary bg-secondary/10'
                : 'border-outline-variant/30 bg-surface-container-low'
            }`}
          >
            <Icon
              name={badge.earned ? 'star' : 'lock'}
              className={`mx-auto mb-1 ${badge.earned ? 'text-secondary' : 'text-outline'}`}
              filled={badge.earned}
            />
            <p className="text-body-md font-semibold text-primary">{badge.title}</p>
            <p className="mt-1 text-label-caps text-on-surface-variant">
              {badge.earned ? 'Earned' : `${Math.min(badge.current, badge.target)}/${badge.target}`}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
