import { getAllBadgeDefinitions } from '../lib/badges';
import { Icon } from './Icon';

export function BadgeWall() {
  const badges = getAllBadgeDefinitions();

  return (
    <section aria-labelledby="badges-heading">
      <h2 id="badges-heading" className="mb-stack-md font-display text-headline-md text-primary">
        Badge Wall
      </h2>
      <div className="grid grid-cols-2 gap-gutter">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`stitch-card p-stack-md text-center transition-transform active:scale-95 ${
              badge.earnedAt
                ? 'border-l-4 border-secondary'
                : 'opacity-50 grayscale'
            }`}
          >
            <Icon
              name={badge.earnedAt ? 'military_tech' : 'lock'}
              className={`mb-2 text-3xl ${badge.earnedAt ? 'text-secondary' : 'text-outline'}`}
              filled={!!badge.earnedAt}
            />
            <p className="text-body-md font-semibold text-primary">{badge.title}</p>
            <p className="mt-1 text-label-caps text-on-surface-variant">{badge.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
