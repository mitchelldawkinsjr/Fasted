import { getBadgeSpritePath } from '../lib/badgeSprites';
import type { BadgeId } from '../types';

type Props = {
  id: BadgeId;
  earned?: boolean;
  size?: number;
  className?: string;
  title?: string;
};

export function BadgeSprite({ id, earned = true, size = 48, className = '' }: Props) {
  return (
    <img
      src={getBadgeSpritePath(id)}
      alt=""
      aria-hidden
      width={size}
      height={size}
      draggable={false}
      className={`mx-auto shrink-0 select-none ${earned ? '' : 'badge-locked'} ${className}`}
    />
  );
}
