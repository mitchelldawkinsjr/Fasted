import { getCurrentStreak, getLongestStreak } from '../lib/streaks';

type Props = {
  today: string;
};

export function StreakWidget({ today }: Props) {
  const current = getCurrentStreak(today);
  const longest = getLongestStreak();

  return (
    <section
      className="grid grid-cols-2 gap-gutter"
      aria-label="Streak summary"
    >
      <div className="stitch-card border-l-4 border-secondary p-stack-md">
        <span className="label-caps text-on-surface-variant opacity-70">Current Streak</span>
        <div className="mt-1 flex items-baseline gap-unit">
          <span className="font-display text-display-scripture text-primary">{current}</span>
          <span className="font-display text-headline-md text-secondary">Days</span>
        </div>
      </div>
      <div className="stitch-card border-l-4 border-primary-container p-stack-md">
        <span className="label-caps text-on-surface-variant opacity-70">Longest</span>
        <div className="mt-1 flex items-baseline gap-unit">
          <span className="font-display text-headline-md text-primary">{longest}</span>
          <span className="label-caps text-on-surface-variant">Days</span>
        </div>
      </div>
    </section>
  );
}
