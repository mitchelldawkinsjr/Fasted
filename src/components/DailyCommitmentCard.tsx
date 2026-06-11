import { getAllPlanDates } from '../lib/dateUtils';
import { getCurrentStreak } from '../lib/streaks';
import { Icon } from './Icon';

type Props = {
  date: string;
  checkedIn: boolean;
  onCheckIn: () => void;
};

export function DailyCommitmentCard({ date, checkedIn, onCheckIn }: Props) {
  const streak = getCurrentStreak(date);
  const totalDays = getAllPlanDates().length;
  const progress = Math.min(100, (streak / totalDays) * 100);

  return (
    <section className="rounded-xl bg-primary-container p-stack-lg text-on-primary grace-shadow">
      <div className="flex flex-col justify-between gap-stack-md md:flex-row md:items-center">
        <div>
          <h3 className="font-display text-headline-md">Daily Commitment</h3>
          <p className="mt-1 text-body-md text-on-primary-container">
            Confirm your fast today to maintain your spiritual rhythm.
          </p>
        </div>
        {checkedIn ? (
          <div className="flex items-center gap-2 rounded-lg bg-secondary-container px-6 py-3 text-on-secondary-container">
            <Icon name="check_circle" filled />
            <span className="font-semibold">Checked In</span>
          </div>
        ) : (
          <button type="button" onClick={onCheckIn} className="btn-stitch-primary">
            Check-in for Today
          </button>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-end justify-between">
          <span className="label-caps text-on-primary-container">STREAK TRACKER</span>
          <span className="font-display text-headline-md text-secondary-container">
            {streak}{' '}
            <span className="text-body-md font-normal text-on-primary-container">
              of {totalDays} days
            </span>
          </span>
        </div>
        <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-l-full bg-secondary-container transition-all"
            style={{ width: `${Math.max(progress, streak > 0 ? 2 : 0)}%` }}
          />
          <div className="h-full w-full bg-white/5" />
        </div>
      </div>
    </section>
  );
}
