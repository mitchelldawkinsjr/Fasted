import { useMemo, useState } from 'react';
import { PHASE_TEMPLATES } from '../data/phaseTemplates';
import { getJourneyPhaseWindows } from '../lib/journey';
import { formatDisplayDate, getLocalDateString } from '../lib/dateUtils';
import { saveJourney, setActiveJourney } from '../lib/storage';
import type { Journey, JourneyPhase } from '../types';
import { LoadingButton } from './LoadingButton';
import { Icon } from './Icon';

type Props = {
  open: boolean;
  onClose: () => void;
};

function createJourneyId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `journey-${crypto.randomUUID()}`;
  }
  return `journey-${Date.now().toString(36)}`;
}

export function JourneyBuilder({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [selected, setSelected] = useState<string[]>(PHASE_TEMPLATES.map((t) => t.id));
  const [busy, setBusy] = useState(false);

  const draftJourney = useMemo((): Journey | null => {
    if (!name.trim() || selected.length === 0) return null;
    const phases: JourneyPhase[] = selected.map((templateId, order) => ({ templateId, order }));
    return { id: createJourneyId(), name: name.trim(), startDate, phases };
  }, [name, selected, startDate]);

  const windows = draftJourney ? getJourneyPhaseWindows(draftJourney) : [];

  if (!open) return null;

  const toggleTemplate = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const moveTemplate = (id: string, direction: -1 | 1) => {
    setSelected((prev) => {
      const index = prev.indexOf(id);
      if (index < 0) return prev;
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!draftJourney) return;
    setBusy(true);
    try {
      saveJourney(draftJourney);
      setActiveJourney(draftJourney.id);
      onClose();
      setStep(0);
      setName('');
      setSelected(PHASE_TEMPLATES.map((t) => t.id));
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface-container-lowest shadow-grace-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="journey-builder-title"
      >
        <div className="flex items-center justify-between border-b border-surface-variant px-gutter py-4">
          <h2 id="journey-builder-title" className="font-display text-headline-md text-primary">
            Create Journey
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-surface-container">
            <Icon name="close" />
          </button>
        </div>

        <div className="space-y-4 p-gutter">
          {step === 0 && (
            <>
              <label className="block">
                <span className="mb-1 block text-body-md text-on-surface">Journey name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Summer Consecration"
                  className={inputClass}
                />
              </label>
              <LoadingButton
                type="button"
                disabled={!name.trim()}
                onClick={() => setStep(1)}
                className="w-full"
              >
                Next
              </LoadingButton>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-body-md text-on-surface-variant">
                Choose phases and reorder. At least one phase is required.
              </p>
              <ul className="space-y-2">
                {selected.map((templateId) => {
                  const template = PHASE_TEMPLATES.find((t) => t.id === templateId);
                  if (!template) return null;
                  return (
                    <li
                      key={templateId}
                      className="flex items-center gap-2 rounded-xl border border-surface-variant bg-surface-container-low p-3"
                    >
                      <img
                        src={template.imagePath}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-md text-on-surface">{template.title}</p>
                        <p className="text-label-caps text-on-surface-variant">
                          {template.durationDays} days
                        </p>
                      </div>
                      <button type="button" onClick={() => moveTemplate(templateId, -1)} aria-label="Move up">
                        <Icon name="arrow_upward" size={18} />
                      </button>
                      <button type="button" onClick={() => moveTemplate(templateId, 1)} aria-label="Move down">
                        <Icon name="arrow_downward" size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleTemplate(templateId)}
                        aria-label="Remove phase"
                      >
                        <Icon name="close" size={18} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap gap-2">
                {PHASE_TEMPLATES.filter((t) => !selected.includes(t.id)).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => toggleTemplate(template.id)}
                    className="rounded-full bg-secondary-container px-3 py-1 text-label-caps text-on-secondary-container"
                  >
                    + {template.title}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(0)} className="flex-1 rounded-xl bg-surface-container px-4 py-3">
                  Back
                </button>
                <LoadingButton
                  type="button"
                  disabled={selected.length === 0}
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  Next
                </LoadingButton>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <label className="block">
                <span className="mb-1 block text-body-md text-on-surface">Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                />
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-xl bg-surface-container px-4 py-3">
                  Back
                </button>
                <LoadingButton type="button" onClick={() => setStep(3)} className="flex-1">
                  Review
                </LoadingButton>
              </div>
            </>
          )}

          {step === 3 && draftJourney && (
            <>
              <p className="text-body-md text-on-surface">
                <strong>{draftJourney.name}</strong> starts {formatDisplayDate(startDate)}.
              </p>
              <ul className="space-y-2">
                {windows.map((window) => {
                  const template = PHASE_TEMPLATES.find((t) => t.id === window.templateId);
                  return (
                    <li key={window.templateId} className="rounded-xl bg-surface-container-low p-3 text-body-md">
                      {template?.title}: {formatDisplayDate(window.startDate)} –{' '}
                      {formatDisplayDate(window.endDate)}
                    </li>
                  );
                })}
              </ul>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-xl bg-surface-container px-4 py-3">
                  Back
                </button>
                <LoadingButton type="button" loading={busy} onClick={() => void handleConfirm()} className="flex-1">
                  Start Journey
                </LoadingButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
