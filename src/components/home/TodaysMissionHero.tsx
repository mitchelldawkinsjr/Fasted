import type { DailyFastPlan, FastPhase } from '../../types';
import { FAST_SCHEDULE_LABELS, FAST_TYPE_LABELS } from '../../lib/homeScreenLabels';
import { Icon } from '../Icon';

type Props = {
  plan: DailyFastPlan;
  phase: FastPhase | undefined;
  focusLabel: string;
  onBeginJourney: () => void;
  journeyStarted: boolean;
  journeyComplete: boolean;
};

export function TodaysMissionHero({
  plan,
  phase,
  focusLabel,
  onBeginJourney,
  journeyStarted,
  journeyComplete,
}: Props) {
  const scheduleLabel = FAST_SCHEDULE_LABELS[plan.fastType];
  const fastLabel = FAST_TYPE_LABELS[plan.fastType];

  return (
    <section
      className="stitch-card overflow-hidden border-l-4 p-stack-lg sm:p-8"
      style={{ borderLeftColor: phase?.themeColor ?? '#fed65b' }}
      aria-labelledby="todays-mission-heading"
      data-tour="today-card"
    >
      <p className="label-caps text-secondary">Today&apos;s Journey</p>
      <h2 id="todays-mission-heading" className="mt-2 font-display text-headline-lg text-primary">
        {phase?.title ?? 'Your Fast'}
      </h2>
      <p className="mt-1 text-body-lg text-on-surface-variant">{scheduleLabel}</p>

      <div className="mt-stack-lg grid gap-stack-md sm:grid-cols-2">
        <div className="rounded-xl bg-surface-container-high/50 px-4 py-3">
          <p className="label-caps text-on-surface-variant">Today&apos;s Focus</p>
          <p className="mt-1 font-display text-headline-md text-primary">{focusLabel}</p>
        </div>
        <div className="rounded-xl bg-surface-container-high/50 px-4 py-3">
          <p className="label-caps text-on-surface-variant">Estimated Time</p>
          <p className="mt-1 font-display text-headline-md text-primary">15–20 minutes</p>
        </div>
      </div>

      <p className="mt-stack-md text-body-md text-on-surface-variant">{fastLabel}</p>

      {journeyComplete ? (
        <div className="mt-stack-lg flex items-center justify-center gap-2 rounded-xl bg-secondary-container/30 px-6 py-4 text-on-secondary-container">
          <Icon name="check_circle" filled />
          <span className="text-body-lg font-semibold">Today&apos;s journey complete</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onBeginJourney}
          className="btn-stitch-primary mt-stack-lg w-full text-center text-body-xl"
          data-testid="begin-journey-btn"
        >
          {journeyStarted ? 'Continue Today\'s Journey' : 'Begin Today\'s Journey'}
        </button>
      )}
    </section>
  );
}
