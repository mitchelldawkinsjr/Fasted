import { Link } from 'react-router-dom';
import { FAST_PHASES } from '../data/fastingPlan';
import { formatDisplayDate } from '../lib/dateUtils';
import { Icon } from '../components/Icon';

export function PhasesPage() {
  return (
    <div className="space-y-stack-lg animate-fade-in-up">
      <section>
        <h2 className="font-display text-headline-lg-mobile text-primary">
          The 8 Spiritual Phases
        </h2>
        <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
          Journey through the sacred rhythms of self-denial and spiritual awakening. Each phase
          is a step closer to divine clarity.
        </p>
      </section>

      <img
        src="/assets/fasting-plan-all-phases.png"
        alt="Full overview of all eight fasting phases"
        className="w-full rounded-xl grace-shadow"
      />

      <div className="space-y-stack-md">
        {FAST_PHASES.map((phase) => (
          <article
            key={phase.id}
            className="group relative flex cursor-pointer gap-gutter overflow-hidden rounded-xl border border-transparent bg-surface-container-lowest p-stack-md grace-shadow transition-all hover:border-secondary-container active:scale-[0.98]"
          >
            <div
              className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
              style={{ backgroundColor: phase.themeColor }}
            />
            <img
              src={phase.imagePath}
              alt={`${phase.title} illustration`}
              className="h-24 w-24 shrink-0 rounded-lg object-cover transition-transform duration-500 group-hover:scale-105 md:h-32 md:w-32"
            />
            <div className="min-w-0 flex-grow">
              <div className="mb-unit flex items-start justify-between gap-2">
                <div>
                  <span className="label-caps text-secondary">Phase {phase.id}</span>
                  <h3 className="font-display text-headline-md text-primary">{phase.title}</h3>
                </div>
                <span className="shrink-0 label-caps text-on-surface-variant">
                  {formatDisplayDate(phase.startDate).split(',')[1]?.trim()}
                </span>
              </div>
              <p className="mb-stack-sm text-body-md italic text-on-surface-variant">
                {phase.scriptureReference}
              </p>
              <p className="line-clamp-2 text-body-md text-on-surface-variant">
                {phase.scheduleSummary}
              </p>
              <Link
                to={`/?date=${phase.startDate}`}
                className="mt-stack-md inline-flex items-center gap-1 text-body-md font-medium text-secondary hover:text-primary"
              >
                View Phase
                <Icon name="arrow_forward" size={16} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
