import { useActiveJourney } from '../hooks/useActiveJourney';
import type { DailyFastPlan } from '../types';
import { getAllPlanDates } from '../lib/dateUtils';
import { Icon } from './Icon';
import { OverviewSection } from './OverviewSection';

type Props = {
  plan: DailyFastPlan;
};

const FAST_TYPE_LABELS: Record<DailyFastPlan['fastType'], string> = {
  'normal-eating': 'Preparation / Normal Eating Day',
  'sunrise-to-sunset-water': 'Fast Day: Water Only',
  'sunrise-to-sunset-with-coffee-tea': 'Fast Day: Water, Coffee & Tea',
  'daniel-fast': 'Daniel Fast Day',
  'twenty-four-hour-water': '24-Hour Water Fast',
  'extended-prayer': 'Extended Prayer Day',
};

export function TodayFastCard({ plan }: Props) {
  const { phases, planStart, planEnd, journey } = useActiveJourney();
  const phase = phases.find((p) => p.id === plan.phaseId);
  const planDates = getAllPlanDates(journey);
  const totalDays = planDates.length;
  const dayNumber = planDates.findIndex((d) => d === plan.date) + 1;
  const [year, month, day] = plan.date.split('-');

  return (
    <section className="space-y-stack-lg animate-fade-in-up">
      <div className="space-y-stack-lg" data-tour="today-card">
        <header>
          <span className="label-caps text-secondary">
            Phase {plan.phaseId}: {phase?.title}
          </span>
          <h2 className="mt-1 font-display text-headline-lg-mobile text-primary">
            {`${month}-${day}-${year}`}
          </h2>
        </header>

        {phase && (
          <OverviewSection
            phase={phase}
            fastTypeLabel={FAST_TYPE_LABELS[plan.fastType]}
            isFastDay={plan.isFastDay}
          />
        )}
      </div>

      <div
        className="stitch-card border-l-4 p-stack-lg"
        style={{ borderLeftColor: phase?.themeColor ?? '#fed65b' }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Icon name={plan.isFastDay ? 'water_drop' : 'eco'} className="text-secondary" />
          <p className="font-display text-headline-md text-primary">Today&apos;s Instructions</p>
        </div>
        <ul
          data-testid="today-instructions-list"
          className="space-y-2 text-body-md leading-relaxed text-on-surface-variant"
        >
          {plan.instructions.map((instruction) => (
            <li key={instruction} className="flex items-start gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-secondary" aria-hidden />
              {instruction}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-label-caps text-on-surface-variant">
        Day {dayNumber} of {totalDays} · {planStart} – {planEnd}
      </p>
    </section>
  );
}
