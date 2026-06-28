import { useActiveJourney } from '../hooks/useActiveJourney';
import { getPhasesCompletedCount } from '../lib/badges';
import { getCurrentStreak, getLongestStreak, getTotalCheckIns } from '../lib/streaks';

type Props = {
  today: string;
};

export function StreakWidget({ today }: Props) {
  const { phases } = useActiveJourney();
  const current = getCurrentStreak(today);
  const longest = getLongestStreak();
  const checkIns = getTotalCheckIns();
  const phasesCompleted = getPhasesCompletedCount(today);

  const stats = [
    { label: 'Current streak', value: String(current), unit: 'days' },
    { label: 'Longest', value: String(longest), unit: 'days' },
    { label: 'Check-ins', value: String(checkIns), unit: 'days' },
    {
      label: 'Phases',
      value: `${phasesCompleted}/${phases.length}`,
      unit: 'done',
    },
  ] as const;

  return (
    <section className="grid grid-cols-4 gap-2" aria-label="Progress summary">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="stitch-card flex min-h-[5.5rem] min-w-0 flex-col items-center justify-center p-2 text-center"
        >
          <span className="text-wrap-anywhere text-[10px] font-semibold uppercase leading-tight tracking-wide text-on-surface-variant">
            {stat.label}
          </span>
          <span className="mt-1 font-display text-xl leading-none text-primary">{stat.value}</span>
          <span className="mt-0.5 text-[10px] uppercase text-on-surface-variant">{stat.unit}</span>
        </div>
      ))}
    </section>
  );
}
