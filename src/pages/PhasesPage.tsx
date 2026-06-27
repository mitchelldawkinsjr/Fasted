import { Link } from 'react-router-dom';
import { useActiveJourney } from '../hooks/useActiveJourney';
import { formatDisplayDate } from '../lib/dateUtils';
import { Icon } from '../components/Icon';

function formatPhaseDates(startDate: string, endDate: string): string {
  const start = formatDisplayDate(startDate).split(',')[1]?.trim() ?? startDate;
  const end = formatDisplayDate(endDate).split(',')[1]?.trim() ?? endDate;
  return `${start} – ${end}`;
}

export function PhasesPage() {
  const { journey, phases, planStart, planEnd } = useActiveJourney();
  const phaseCountLabel = phases.length === 1 ? '1 phase' : `${phases.length} phases`;

  return (
    <div className="space-y-stack-lg animate-fade-in-up">
      <section>
        <h2 className="font-display text-headline-lg-mobile text-primary">{journey.name}</h2>
        <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
          {phaseCountLabel} from {formatDisplayDate(planStart)} to {formatDisplayDate(planEnd)}.
          Each phase is a step in your chosen path of discipline and renewal.
        </p>
      </section>

      {journey.isDefault && (
        <img
          src="/assets/fasting-plan-all-phases.png"
          alt="Full overview of all fasting phases"
          className="w-full rounded-xl grace-shadow"
        />
      )}

      <div className="space-y-stack-md">
        {phases.map((phase) => (
          <Link
            key={phase.id}
            to={`/?date=${phase.startDate}`}
            className="group relative block min-h-[220px] overflow-hidden rounded-xl grace-shadow transition-transform active:scale-[0.98] md:min-h-[260px]"
          >
            <img
              src={phase.imagePath}
              alt={`${phase.title} fasting plan`}
              className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/15"
              aria-hidden
            />
            <div
              className="absolute left-0 top-0 h-full w-1"
              style={{ backgroundColor: phase.themeColor }}
              aria-hidden
            />

            <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-end p-stack-md text-white md:min-h-[260px]">
              <span className="label-caps text-secondary-container">Phase {phase.id}</span>
              <h3 className="font-display text-headline-md">{phase.title}</h3>
              <p className="mt-1 text-label-caps text-white/80">
                {formatPhaseDates(phase.startDate, phase.endDate)}
              </p>
              <p className="mt-2 line-clamp-2 text-body-md text-white/90">
                {phase.scheduleSummary}
              </p>
              <span className="mt-stack-md inline-flex items-center gap-1 text-body-md font-semibold text-secondary-container">
                View Phase
                <Icon name="arrow_forward" size={16} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
