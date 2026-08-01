import { getMilestonePhaseId } from '../../data/fastingPlan';
import { useActiveJourney } from '../../hooks/useActiveJourney';
import { getAllPlanDates } from '../../lib/dateUtils';
import { Icon } from '../Icon';
import { MilestoneSection } from '../MilestoneSection';

type Props = {
  date: string;
  checkedIn: boolean;
};

export function HomeProgressSummary({ date, checkedIn }: Props) {
  const { journey, getPhaseForDate } = useActiveJourney();
  const phase = getPhaseForDate(date);
  const planDates = getAllPlanDates(journey);
  const dayNumber = planDates.findIndex((d) => d === date) + 1;
  const totalDays = planDates.length;
  const progressPercent = Math.round((dayNumber / totalDays) * 100);

  return (
    <section
      className="stitch-card space-y-stack-md p-stack-lg"
      aria-label="Journey progress"
    >
      <div className="text-center sm:text-left">
        <span className="label-caps text-on-surface-variant">Journey</span>
        <p className="font-display text-headline-md text-primary">
          Day {dayNumber}{' '}
          <span className="text-body-md font-normal text-on-surface-variant">of {totalDays}</span>
        </p>
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
