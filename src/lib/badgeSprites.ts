import { GLOBAL_BADGES, PHASE_MILESTONES } from '../data/phaseAchievements';
import type { BadgeId } from '../types';

const BADGE_BASE = '/assets-2/badges';

const ALL_BADGE_IDS: BadgeId[] = [
  ...GLOBAL_BADGES.map((b) => b.id),
  ...PHASE_MILESTONES.map((m) => m.id),
];

const BADGE_SPRITE_PATHS = Object.fromEntries(
  ALL_BADGE_IDS.map((id) => [id, `${BADGE_BASE}/${id}.png`]),
) as Record<BadgeId, string>;

export function getBadgeSpritePath(id: BadgeId): string {
  return BADGE_SPRITE_PATHS[id] ?? `${BADGE_BASE}/${id}.png`;
}

export { ALL_BADGE_IDS, BADGE_SPRITE_PATHS };
