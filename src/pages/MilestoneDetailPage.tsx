import { Link, Navigate, useParams } from 'react-router-dom';
import { BadgeSprite } from '../components/BadgeSprite';
import { Icon } from '../components/Icon';
import { formatMilestoneDayLabel } from '../lib/milestones';
import { PHASE_MILESTONES } from '../data/phaseAchievements';
import { getPhaseById } from '../data/fastingPlan';
import { getAllBadgeDefinitions } from '../lib/badges';
import { formatDisplayDate, getLocalDateString } from '../lib/dateUtils';

export function MilestoneDetailPage() {
  const { milestoneId } = useParams<{ milestoneId: string }>();
  const today = getLocalDateString();

  const badge = getAllBadgeDefinitions(today).find((b) => b.id === milestoneId);
  if (!badge) {
    return <Navigate to="/" replace />;
  }

  const milestoneDef = badge.phaseId
    ? PHASE_MILESTONES.find((m) => m.id === milestoneId)
    : null;
  const phase = milestoneDef ? getPhaseById(milestoneDef.phaseId) : null;
  const dayLabel = milestoneDef
    ? formatMilestoneDayLabel(milestoneDef.threshold)
    : null;

  return (
    <div className="space-y-stack-lg animate-fade-in-up pb-stack-lg">
      <Link
        to="/progress"
        className="inline-flex items-center gap-1 text-body-md font-medium text-primary transition-opacity hover:opacity-80"
      >
        <Icon name="arrow_back" size={20} />
        Your Sacred Journey
      </Link>

      <section
        className={`stitch-card overflow-hidden text-center ${
          badge.earned ? '' : 'opacity-90'
        }`}
      >
        <div
          className={`px-stack-md py-stack-lg ${
            badge.earned
              ? 'bg-gradient-to-br from-secondary-container via-surface to-linen'
              : 'bg-surface-container-low'
          }`}
        >
          <div className={`mx-auto w-fit rounded-full ${badge.earned ? 'grace-shadow' : ''}`}>
            <BadgeSprite
              id={badge.id}
              earned={badge.earned}
              size={120}
              title={badge.title}
            />
          </div>

          {dayLabel && (
            <p className="mt-stack-md label-caps text-on-surface-variant">{dayLabel}</p>
          )}
          <h1
            className={`${dayLabel ? 'mt-1' : 'mt-stack-md'} font-display text-headline-lg-mobile ${
              badge.earned ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            {badge.title}
          </h1>

          {phase && (
            <p className="mt-2 text-body-md text-on-surface-variant">
              {phase.title}
            </p>
          )}

          <p
            className={`mx-auto mt-stack-md max-w-sm text-body-md ${
              badge.earned ? 'text-on-surface' : 'text-on-surface-variant'
            }`}
          >
            {badge.description}
          </p>

          <div className="mt-stack-lg inline-flex items-center gap-2 rounded-full px-4 py-2 text-body-md font-semibold">
            {badge.earned ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-4 py-2 text-on-secondary-container">
                <Icon name="military_tech" size={20} filled />
                Earned
                {badge.earnedAt && (
                  <span className="font-normal opacity-80">
                    · {formatDisplayDate(badge.earnedAt.slice(0, 10))}
                  </span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-4 py-2 text-on-surface-variant">
                <Icon name="lock" size={18} />
                Not yet earned
                <span className="font-normal">
                  · {Math.min(badge.current, badge.target)}/{badge.target}
                </span>
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
