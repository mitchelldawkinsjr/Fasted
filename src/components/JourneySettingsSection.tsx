import { useEffect, useState } from 'react';
import { FASTED_JOURNEY } from '../data/phaseTemplates';
import { useActiveJourney } from '../hooks/useActiveJourney';
import { formatDisplayDate } from '../lib/dateUtils';
import { getJourneyPlanEnd } from '../lib/journey';
import { setActiveJourney, updateFastedJourneyStartDate } from '../lib/storage';
import { JourneyBuilder } from './JourneyBuilder';
import { LoadingButton } from './LoadingButton';
import { Icon } from './Icon';
import { toast } from '../lib/toast';
import type { Journey } from '../types';

export function JourneySettingsSection() {
  const { progress, journey, phases } = useActiveJourney();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [startDate, setStartDate] = useState(
    progress.journeys.find((j) => j.id === FASTED_JOURNEY.id)?.startDate ?? FASTED_JOURNEY.startDate,
  );

  useEffect(() => {
    const stored =
      progress.journeys.find((j) => j.id === FASTED_JOURNEY.id)?.startDate ?? FASTED_JOURNEY.startDate;
    setStartDate(stored);
  }, [progress.journeys]);

  const fieldClass =
    'w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  const dateInputClass = `date-input ${fieldClass}`;

  return (
    <>
      <section className="stitch-card overflow-hidden" data-tour="settings-journeys">
        <div className="border-b border-surface-variant px-gutter py-4">
          <h2 className="label-caps text-secondary">YOUR JOURNEY</h2>
        </div>
        <div className="min-w-0 divide-y divide-surface-variant p-gutter space-y-4">
          <div>
            <p className="text-label-caps text-on-surface-variant">Active journey</p>
            <p className="text-body-md text-on-surface">{journey.name}</p>
            <p className="text-label-caps text-on-surface-variant">
              {formatDisplayDate(journey.startDate)} –{' '}
              {formatDisplayDate(getJourneyPlanEnd(journey))} · {phases.length} phases
            </p>
          </div>

          {progress.journeys.length > 1 && (
            <label className="block">
              <span className="mb-1 block text-body-md text-on-surface">Switch journey</span>
              <select
                value={progress.activeJourneyId}
                onChange={(e) => {
                  setActiveJourney(e.target.value);
                  toast.info('Active journey updated');
                }}
                className={fieldClass}
              >
                {progress.journeys.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {journey.locked ? (
            <label className="block min-w-0">
              <span className="mb-1 block text-body-md text-on-surface">Fasted Journey start date</span>
              <div className="min-w-0 overflow-hidden rounded-xl">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={dateInputClass}
                />
              </div>
              <LoadingButton
                type="button"
                className="mt-2 w-full"
                onClick={() => {
                  updateFastedJourneyStartDate(startDate);
                  toast.success('Journey start date updated');
                }}
              >
                Save Start Date
              </LoadingButton>
            </label>
          ) : null}

          {!journey.locked ? (
            <button
              type="button"
              onClick={() => {
                setEditingJourney(journey);
                setBuilderOpen(true);
              }}
              className="group flex w-full items-center justify-between rounded-xl bg-surface-container px-4 py-3 text-on-surface"
            >
              <span className="flex items-center gap-3 text-body-md">
                <Icon name="edit" />
                Edit active journey
              </span>
              <Icon name="chevron_right" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setEditingJourney(null);
              setBuilderOpen(true);
            }}
            className="group flex w-full items-center justify-between rounded-xl bg-secondary-container px-4 py-3 text-on-secondary-container"
          >
            <span className="flex items-center gap-3 text-body-md">
              <Icon name="route" />
              Create custom journey
            </span>
            <Icon name="chevron_right" />
          </button>
        </div>
      </section>

      <JourneyBuilder
        open={builderOpen}
        onClose={() => {
          setBuilderOpen(false);
          setEditingJourney(null);
        }}
        initialJourney={editingJourney}
      />
    </>
  );
}
