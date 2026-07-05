import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PhaseMoodChart } from '../components/PhaseMoodChart';
import { MoodPhaseGrid } from '../components/mood-visualizer/MoodPhaseGrid';
import { MoodWheel } from '../components/mood-visualizer/MoodWheel';
import { useActiveJourney } from '../hooks/useActiveJourney';
import { trackEvent } from '../lib/analytics';
import {
  clampMonthKey,
  formatMonthLabel,
  getMoodEntries,
  getPlanMonths,
  toMonthKey,
} from '../lib/moodVisualizer';
import { getMonthMoodSummary, getPhaseMoodSummary } from '../lib/moodStats';
import { getLocalDateString } from '../lib/dateUtils';

type ViewMode = 'monthly' | 'phase';

export function MoodVisualizerPage() {
  const [searchParams] = useSearchParams();
  const today = getLocalDateString();
  const { phases } = useActiveJourney();
  const planMonths = useMemo(() => getPlanMonths(), []);
  const monthParam = searchParams.get('month');
  const initialMonth = clampMonthKey(
    monthParam && planMonths.includes(monthParam)
      ? monthParam
      : toMonthKey(Number(today.slice(0, 4)), Number(today.slice(5, 7))),
  );
  const [view, setView] = useState<ViewMode>(() =>
    searchParams.get('view') === 'phase' ? 'phase' : 'monthly',
  );
  const [monthKey, setMonthKey] = useState(initialMonth);
  const totalEntries = getMoodEntries().length;
  const trackedInitialView = useRef(false);

  useEffect(() => {
    if (trackedInitialView.current) return;
    trackedInitialView.current = true;
    trackEvent('mood_chart_viewed', {
      initial_view: searchParams.get('view') === 'phase' ? 'phase' : 'monthly',
      has_entries: totalEntries > 0,
    });
  }, [searchParams, totalEntries]);

  const changeView = (nextView: ViewMode) => {
    if (nextView === view) return;
    setView(nextView);
    trackEvent('mood_chart_view_changed', { view: nextView });
  };

  const monthIndex = planMonths.indexOf(monthKey);
  const canGoPrev = monthIndex > 0;
  const canGoNext = monthIndex >= 0 && monthIndex < planMonths.length - 1;
  const monthMoodSummary = useMemo(() => getMonthMoodSummary(monthKey), [monthKey]);

  function shiftMonth(delta: number) {
    const nextIndex = monthIndex + delta;
    if (nextIndex < 0 || nextIndex >= planMonths.length) return;
    setMonthKey(planMonths[nextIndex]);
  }

  return (
    <div className="space-y-stack-lg animate-fade-in-up">
      <div className="flex items-center gap-stack-sm">
        <Link
          to="/progress"
          className="flex items-center gap-1 text-body-md font-medium text-primary transition-opacity hover:opacity-80"
        >
          <Icon name="arrow_back" size={20} />
          Your Sacred Journey
        </Link>
      </div>

      <section className="space-y-unit text-center">
        <h2 className="font-display text-headline-lg-mobile text-primary">Mood Chart</h2>
        <p className="text-body-md text-on-surface-variant">
          Daily reflection colors across your sacred journey.
        </p>
      </section>

      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={() => changeView('monthly')}
          className={`rounded-full px-4 py-2 text-label-caps transition-all ${
            view === 'monthly'
              ? 'bg-secondary-container text-on-secondary-container'
              : 'bg-surface-container text-on-surface-variant'
          }`}
        >
          Month view
        </button>
        <button
          type="button"
          onClick={() => changeView('phase')}
          className={`rounded-full px-4 py-2 text-label-caps transition-all ${
            view === 'phase'
              ? 'bg-secondary-container text-on-secondary-container'
              : 'bg-surface-container text-on-surface-variant'
          }`}
        >
          Phase view
        </button>
      </div>

      {totalEntries === 0 ? (
        <section className="stitch-card p-stack-lg text-center">
          <p className="text-body-md text-on-surface-variant">
            No moods logged yet. Add a daily reflection in your journal to see your mood chart
            here.
          </p>
          <Link to="/journal" className="btn-stitch-primary mt-stack-md inline-block">
            Open journal
          </Link>
        </section>
      ) : view === 'monthly' ? (
        <>
          <section className="stitch-card min-w-0 overflow-hidden p-stack-lg">
            <div className="mb-stack-md flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                disabled={!canGoPrev}
                className="rounded-full p-2 text-primary transition-all hover:bg-surface-container disabled:opacity-30"
                aria-label="Previous month"
              >
                <Icon name="chevron_left" />
              </button>
              <span className="font-display text-headline-md text-primary">
                {formatMonthLabel(monthKey)}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                disabled={!canGoNext}
                className="rounded-full p-2 text-primary transition-all hover:bg-surface-container disabled:opacity-30"
                aria-label="Next month"
              >
                <Icon name="chevron_right" />
              </button>
            </div>

            <MoodWheel monthKey={monthKey} />
          </section>

          <PhaseMoodChart
            summary={monthMoodSummary}
            title={`${formatMonthLabel(monthKey)} mood breakdown`}
          />
        </>
      ) : (
        <>
          <section className="stitch-card overflow-hidden p-stack-md sm:p-stack-lg">
            <MoodPhaseGrid />
          </section>

          <section className="space-y-stack-md">
            <h3 className="label-caps text-on-surface-variant">Mood breakdown by phase</h3>
            {phases.map((phase) => {
              const summary = getPhaseMoodSummary(phase.startDate, phase.endDate, today);
              if (summary.total === 0) return null;
              return (
                <PhaseMoodChart
                  key={phase.id}
                  summary={summary}
                  title={phase.title}
                  compact
                />
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
