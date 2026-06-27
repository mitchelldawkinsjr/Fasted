import { Link } from 'react-router-dom';
import { CalendarGrid } from '../components/CalendarGrid';
import { InfoBanner } from '../components/InfoBanner';
import { Icon } from '../components/Icon';
import { useActiveJourney } from '../hooks/useActiveJourney';
import { formatDisplayDate, getLocalDateString } from '../lib/dateUtils';

export function CalendarPage() {
  const today = getLocalDateString();
  const { journey, phases, planStart, planEnd } = useActiveJourney();
  const beforePlan = today < planStart;
  const afterPlan = today > planEnd;
  const phaseLinkLabel =
    phases.length === 1 ? 'View Phase' : `View ${phases.length} Phases`;

  return (
    <div className="space-y-stack-lg animate-fade-in-up">
      {beforePlan && (
        <InfoBanner variant="preview" icon="event_upcoming">
          {journey.name} begins {formatDisplayDate(planStart)}. Browse the full timeline below.
        </InfoBanner>
      )}
      {afterPlan && (
        <InfoBanner variant="preview" icon="history">
          {journey.name} ended {formatDisplayDate(planEnd)}. Your timeline remains here.
        </InfoBanner>
      )}

      <section>
        <h2 className="font-display text-headline-lg-mobile text-primary">{journey.name}</h2>
        <p className="mt-2 max-w-md text-body-md text-on-surface-variant">
          {phases.length} {phases.length === 1 ? 'phase' : 'phases'} from{' '}
          {formatDisplayDate(planStart)} to {formatDisplayDate(planEnd)}.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {phases.map((phase) => (
          <span
            key={phase.id}
            className={`rounded-full px-3 py-1 label-caps text-phase-${phase.id} bg-phase-${phase.id}/10`}
            style={{ color: phase.themeColor }}
          >
            {phase.id}. {phase.title.split(' ').slice(0, 2).join(' ')}
          </span>
        ))}
      </div>

      <p className="flex items-center gap-4 text-label-caps text-on-surface-variant">
        <span className="flex items-center gap-1">
          <Icon name="water_drop" className="text-phase-1" size={14} /> Fast day
        </span>
        <span className="flex items-center gap-1">
          <Icon name="check" className="text-secondary" size={14} /> Checked in
        </span>
      </p>

      <CalendarGrid />

      <Link to="/phases" className="btn-stitch-secondary block text-center">
        {phaseLinkLabel}
      </Link>
    </div>
  );
}
