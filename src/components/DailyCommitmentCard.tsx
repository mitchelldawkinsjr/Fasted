import { useActiveJourney } from '../hooks/useActiveJourney';
import { getNextReward } from '../lib/badges';
import { getPhaseDates } from '../lib/phaseProgress';
import { getCurrentStreak } from '../lib/streaks';
import { Icon } from './Icon';
import { PhaseMilestonesCard } from './PhaseMilestonesCard';

type Props = {
  date: string;
  checkedIn: boolean;
  onCheckIn: () => void;
};

export function DailyCommitmentCard({ date, checkedIn, onCheckIn }: Props) {
  const { getPhaseForDate } = useActiveJourney();
  const streak = getCurrentStreak(date);
  const phase = getPhaseForDate(date);
  const nextReward = phase && !phase.isCustom
    ? getNextReward(phase.id, phase.startDate, phase.endDate, date)
    : null;

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

      <div className="mt-8 space-y-stack-md">
        <div>
          <div className="mb-2 flex items-end justify-between">
            <span className="label-caps text-on-primary-container">CHECK-IN STREAK</span>
            <span className="font-display text-headline-md text-secondary-container">
              {streak}{' '}
              <span className="text-body-md font-normal text-on-primary-container">
                consecutive days
              </span>
            </span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-secondary-container transition-all"
              style={{
                width: `${Math.min(100, Math.max(streak > 0 ? 8 : 0, (streak / 21) * 100))}%`,
              }}
            />
          </div>
        </div>

        {phase && (
          <>
            <div className="flex items-end justify-between text-on-primary-container">
              <span className="label-caps">THIS PHASE</span>
              <span className="text-body-md">
                {phase.title} · {getPhaseDates(phase.startDate, phase.endDate).length} days
              </span>
            </div>
            {!phase.isCustom && <PhaseMilestonesCard phaseId={phase.id} today={date} compact />}
          </>
        )}

        {nextReward && (
          <p className="rounded-lg bg-black/10 px-3 py-2 text-body-md text-on-primary-container">
            <span className="label-caps text-secondary-container">Next milestone · </span>
            {nextReward.title} ({Math.min(nextReward.current, nextReward.target)}/
            {nextReward.target})
          </p>
        )}
      </div>
    </section>
  );
}
