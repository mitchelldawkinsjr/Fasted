import { getMilestonePhaseId } from '../../data/fastingPlan';
import { useActiveJourney } from '../../hooks/useActiveJourney';
import { getAllPlanDates } from '../../lib/dateUtils';
import { getNextReward } from '../../lib/badges';
import { getCurrentStreak } from '../../lib/streaks';
import { Icon } from '../Icon';
import { MilestoneSection } from '../MilestoneSection';

type Props = {
  date: string;
  checkedIn: boolean;
};

export function HomeProgressSummary({ date, checkedIn }: Props) {
  const { journey, getPhaseForDate } = useActiveJourney();
  const phase = getPhaseForDate(date);
  const streak = getCurrentStreak(date);
  const planDates = getAllPlanDates(journey);
  const dayNumber = planDates.findIndex((d) => d === date) + 1;
  const totalDays = planDates.length;
  const progressPercent = Math.round((dayNumber / totalDays) * 100);

  const nextReward =
    phase && !phase.isCustom
      ? getNextReward(getMilestonePhaseId(phase), phase.startDate, phase.endDate, date)
      : null;

  return (
    <section
      className="stitch-card space-y-stack-md p-stack-lg"
      aria-label="Today's progress"
      data-tour="checkin-btn"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon name="local_fire_department" className="text-secondary" filled />
          <div>
            <span className="label-caps text-on-surface-variant">Check-in streak</span>
            <p className="font-display text-headline-md text-primary">
              {streak} <span className="text-body-md font-normal text-on-surface-variant">days</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="label-caps text-on-surface-variant">Journey</span>
          <p className="font-display text-headline-md text-primary">
            Day {dayNumber}{' '}
            <span className="text-body-md font-normal text-on-surface-variant">of {totalDays}</span>
          </p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-end justify-between">
          <span className="label-caps text-on-surface-variant">Progress</span>
          <span className="text-body-md text-on-surface-variant">{progressPercent}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div
            className="h-full rounded-full bg-secondary transition-all"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Journey progress ${progressPercent} percent`}
          />
        </div>
      </div>

      {nextReward && (
        <div className="rounded-xl bg-surface-container-high/60 px-4 py-3">
          <p className="label-caps text-on-surface-variant">Next milestone</p>
          <p className="mt-1 font-display text-headline-sm text-primary">{nextReward.title}</p>
          <p className="text-body-md text-on-surface-variant">
            {nextReward.target - nextReward.current === 1
              ? '1 day remaining'
              : `${nextReward.target - nextReward.current} days remaining`}
          </p>
        </div>
      )}

      {phase && !phase.isCustom && (
        <MilestoneSection phaseId={getMilestonePhaseId(phase)} today={date} />
      )}

      {checkedIn && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-secondary-container/30 px-4 py-3 text-on-secondary-container">
          <Icon name="check_circle" filled />
          <span className="font-semibold">Checked In</span>
        </div>
      )}
    </section>
  );
}
