import { Link, Navigate, useParams } from 'react-router-dom';
import { BadgeSprite } from '../components/BadgeSprite';
import { Icon } from '../components/Icon';
import { formatMilestoneDayLabel } from '../components/MilestoneLabel';
import { PHASE_MILESTONES } from '../data/phaseAchievements';
import { getPhaseById } from '../data/fastingPlan';
import { getAllBadgeDefinitions } from '../lib/badges';
import { formatDisplayDate, getLocalDateString } from '../lib/dateUtils';

export function MilestoneDetailPage() {
  const { milestoneId } = useParams<{ milestoneId: string }>();
  const today = getLocalDateString();

  const milestoneDef = PHASE_MILESTONES.find((m) => m.id === milestoneId);
  if (!milestoneDef) {
    return <Navigate to="/" replace />;
  }

  const phase = getPhaseById(milestoneDef.phaseId);
  const badge = getAllBadgeDefinitions(today).find((b) => b.id === milestoneDef.id);
  const earned = badge?.earned ?? false;
  const dayLabel = formatMilestoneDayLabel(milestoneDef.threshold);

  return (
    <div className="space-y-stack-lg animate-fade-in-up pb-stack-lg">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-body-md font-medium text-primary transition-opacity hover:opacity-80"
      >
        <Icon name="arrow_back" size={20} />
        Today
      </Link>

      <section
        className={`stitch-card overflow-hidden text-center ${
          earned ? '' : 'opacity-90'
        }`}
      >
        <div
          className={`px-stack-md py-stack-lg ${
            earned
              ? 'bg-gradient-to-br from-secondary-container via-surface to-linen'
              : 'bg-surface-container-low'
          }`}
        >
          <div className={`mx-auto w-fit rounded-full ${earned ? 'grace-shadow' : ''}`}>
            <BadgeSprite
              id={milestoneDef.id}
              earned={earned}
              size={120}
              title={milestoneDef.title}
            />
          </div>

          <p className="mt-stack-md label-caps text-on-surface-variant">{dayLabel}</p>
          <h1
            className={`mt-1 font-display text-headline-lg-mobile ${
              earned ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            {milestoneDef.title}
          </h1>

          {phase && (
            <p className="mt-2 text-body-md text-on-surface-variant">
              {phase.title}
            </p>
          )}

          <p
            className={`mx-auto mt-stack-md max-w-sm text-body-md ${
              earned ? 'text-on-surface' : 'text-on-surface-variant'
            }`}
          >
            {milestoneDef.description}
          </p>

          <div className="mt-stack-lg inline-flex items-center gap-2 rounded-full px-4 py-2 text-body-md font-semibold">
            {earned ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-4 py-2 text-on-secondary-container">
                <Icon name="military_tech" size={20} filled />
                Earned
                {badge?.earnedAt && (
                  <span className="font-normal opacity-80">
                    · {formatDisplayDate(badge.earnedAt.slice(0, 10))}
                  </span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-4 py-2 text-on-surface-variant">
                <Icon name="lock" size={18} />
                Not yet earned
                {badge && (
                  <span className="font-normal">
                    · {Math.min(badge.current, badge.target)}/{badge.target}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
