import { EmptyState } from '../components/EmptyState';
import { getAllBadgeDefinitions } from '../lib/badges';
import { getLocalDateString } from '../lib/dateUtils';
import { messages } from '../lib/messages';
import { Icon } from './Icon';

export function BadgeWall() {
  const today = getLocalDateString();
  const badges = getAllBadgeDefinitions(today);
  const globalBadges = badges.filter((b) => !b.phaseId);
  const phaseBadges = badges.filter((b) => b.phaseId);
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <section aria-labelledby="badges-heading">
      <h2 id="badges-heading" className="mb-stack-md font-display text-headline-md text-primary">
        Sacred Milestones
      </h2>

      {earnedCount === 0 && (
        <div className="mb-stack-lg">
          <EmptyState
            icon="military_tech"
            title={messages.empty.badges.title}
            description={messages.empty.badges.description}
          />
        </div>
      )}

      <h3 className="mb-2 label-caps text-on-surface-variant">Journey Badges</h3>
      <div className="mb-stack-lg grid grid-cols-2 gap-gutter">
        {globalBadges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>

      <h3 className="mb-2 label-caps text-on-surface-variant">Phase Milestones</h3>
      <div className="grid grid-cols-2 gap-gutter">
        {phaseBadges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>
    </section>
  );
}

function BadgeCard({
  badge,
}: {
  badge: ReturnType<typeof getAllBadgeDefinitions>[number];
}) {
  return (
    <div
      className={`stitch-card p-stack-md text-center transition-transform active:scale-95 ${
        badge.earned ? 'border-l-4 border-secondary' : 'opacity-80'
      }`}
    >
      <Icon
        name={badge.earned ? 'military_tech' : 'lock'}
        className={`mb-2 text-3xl ${badge.earned ? 'text-secondary' : 'text-outline'}`}
        filled={badge.earned}
      />
      <p className="text-body-md font-semibold text-primary">{badge.title}</p>
      <p className="mt-1 text-label-caps text-on-surface-variant">{badge.description}</p>
      {!badge.earned && (
        <p className="mt-2 text-label-caps text-secondary">
          {Math.min(badge.current, badge.target)}/{badge.target}
        </p>
      )}
      {!badge.earned && badge.target > 0 && (
        <div className="mx-auto mt-2 h-1.5 max-w-[120px] overflow-hidden rounded-full bg-surface-container">
          <div
            className="h-full rounded-full bg-secondary transition-all"
            style={{
              width: `${Math.min(100, Math.round((badge.current / badge.target) * 100))}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
