import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { trackEvent } from '../lib/analytics';
import { getTemplateById } from '../data/phaseTemplates';
import { generateScheduleSummary, withGeneratedScheduleSummary } from '../lib/customPhaseContent';
import {
  getJourneyPhaseWindows,
  isCustomJourneyPhase,
} from '../lib/journey';
import { addLocalDays, daysBetween, formatDisplayDate, getLocalDateString } from '../lib/dateUtils';
import { saveJourney, setActiveJourney } from '../lib/storage';
import { toast } from '../lib/toast';
import type { CustomPhaseContent, FastType, Journey, JourneyPhase, SchedulePattern } from '../types';
import { LoadingButton } from './LoadingButton';
import { Icon } from './Icon';

type Props = {
  open: boolean;
  onClose: () => void;
  /** When set, saves locally is skipped and this callback receives the draft journey. */
  onComplete?: (journey: Journey) => void | Promise<void>;
  confirmLabel?: string;
  title?: string;
  initialJourney?: Journey | null;
};

type SchedulePreset = 'normal' | 'weekly' | 'daniel' | 'prayer';

type PhaseDraft = {
  id: string;
  title: string;
  durationDays: number;
  themeColor: string;
  schedulePreset: SchedulePreset;
  fastDays: number[];
  fastType: FastType;
  prayerDays: number[];
  includesWalk: boolean;
  allowed: string;
  avoid: string;
  beverages: string;
  dailyReadings: string;
  prayerFocus: string;
  scriptureReference: string;
  safetyNote: string;
  alwaysInstructions: string;
  fastInstructions: string;
  nonFastInstructions: string;
};

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const FAST_TYPE_OPTIONS: Array<{ value: FastType; label: string }> = [
  { value: 'sunrise-to-sunset-water', label: 'Sunrise to sunset water' },
  { value: 'sunrise-to-sunset-with-coffee-tea', label: 'Sunrise to sunset with coffee/tea' },
  { value: 'twenty-four-hour-water', label: '24-hour water fast' },
];

function createJourneyId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `journey-${crypto.randomUUID()}`;
  }
  return `journey-${Date.now().toString(36)}`;
}

function createDraftId(): string {
  return createJourneyId().replace('journey-', 'phase-');
}

function linesToArray(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function arrayToLines(value: string[] | undefined): string {
  return (value ?? []).join('\n');
}

function parsePhaseDurationDays(raw: string): { value: number | null; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null, error: 'Enter a positive number of days.' };
  }
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 1) {
    return { value: null, error: 'Duration must be at least 1 day.' };
  }
  return { value, error: null };
}

type PhaseDurationDaysFieldProps = {
  phaseId: string;
  durationDays: number;
  onChange: (durationDays: number) => void;
  onInvalid: () => void;
};

function PhaseDurationDaysField({
  phaseId,
  durationDays,
  onChange,
  onInvalid,
}: PhaseDurationDaysFieldProps) {
  const [draft, setDraft] = useState(() => String(durationDays));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(durationDays));
    setError(null);
  }, [phaseId]);

  const getCurrentValue = () => parsePhaseDurationDays(draft).value ?? durationDays;

  const applyValue = (value: number) => {
    const next = Math.max(1, value);
    setDraft(String(next));
    setError(null);
    onChange(next);
  };

  const commitDraft = (raw: string) => {
    const parsed = parsePhaseDurationDays(raw);
    if (parsed.error) {
      setError(parsed.error);
      onInvalid();
      return;
    }
    setError(null);
    setDraft(String(parsed.value));
    onChange(parsed.value ?? 1);
  };

  const stepDuration = (delta: 1 | -1) => {
    applyValue(getCurrentValue() + delta);
  };

  const currentValue = getCurrentValue();

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`flex overflow-hidden rounded-xl border bg-surface-container-low focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary ${
          error ? 'border-error' : 'border-outline-variant'
        }`}
      >
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Duration (days)"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${phaseId}-duration-error` : undefined}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value.replace(/\D/g, ''));
            if (error) setError(null);
          }}
          onBlur={() => commitDraft(draft)}
          className="min-h-11 flex-1 border-0 bg-transparent px-4 py-3 text-body-md focus:outline-none"
        />
        <div className="flex flex-col border-l border-outline-variant">
          <button
            type="button"
            aria-label="Increase duration by 1 day"
            onClick={() => stepDuration(1)}
            className="flex min-h-[22px] min-w-11 flex-1 items-center justify-center hover:bg-surface-container"
          >
            <Icon name="arrow_upward" size={18} />
          </button>
          <button
            type="button"
            aria-label="Decrease duration by 1 day"
            onClick={() => stepDuration(-1)}
            disabled={currentValue <= 1}
            className="flex min-h-[22px] min-w-11 flex-1 items-center justify-center border-t border-outline-variant hover:bg-surface-container disabled:opacity-40"
          >
            <Icon name="arrow_downward" size={18} />
          </button>
        </div>
      </div>
      {error && (
        <span id={`${phaseId}-duration-error`} className="text-label-caps text-error">
          {error}
        </span>
      )}
    </div>
  );
}

function defaultPhaseDraft(index = 0): PhaseDraft {
  return {
    id: createDraftId(),
    title: index === 0 ? 'Consecration Phase' : `Phase ${index + 1}`,
    durationDays: 7,
    themeColor: '#5f6f52',
    schedulePreset: 'weekly',
    fastDays: [3],
    fastType: 'sunrise-to-sunset-water',
    prayerDays: [6],
    includesWalk: false,
    allowed: 'Whole foods\nLean protein\nVegetables\nFruit\nWater',
    avoid: 'Candy\nSoda\nFast food',
    beverages: 'Water',
    dailyReadings: 'Psalm 63',
    prayerFocus: 'Consecration\nFamily\nWisdom',
    scriptureReference: 'Psalm 63:1',
    safetyNote: '',
    alwaysInstructions: 'Pray over today’s focus before your first meal.',
    fastInstructions: 'Use hunger as a reminder to pray.',
    nonFastInstructions: 'Eat with gratitude and prepare your heart for the next fast day.',
  };
}

function schedulePatternFromDraft(draft: PhaseDraft): SchedulePattern {
  switch (draft.schedulePreset) {
    case 'normal':
      return { kind: 'normal-eating' };
    case 'daniel':
      return { kind: 'consecutive-daniel', includesWalk: draft.includesWalk || undefined };
    case 'prayer':
      return {
        kind: 'weekday-with-prayer',
        fastDays: draft.fastDays,
        fastType: draft.fastType,
        prayerDays: draft.prayerDays,
      };
    case 'weekly':
    default:
      return {
        kind: 'weekday-fast',
        fastDays: draft.fastDays,
        fastType: draft.fastType,
      };
  }
}

function contentFromDraft(draft: PhaseDraft): CustomPhaseContent {
  const content: CustomPhaseContent = {
    title: draft.title.trim(),
    themeColor: draft.themeColor || undefined,
    schedulePattern: schedulePatternFromDraft(draft),
    allowed: linesToArray(draft.allowed),
    avoid: linesToArray(draft.avoid),
    beverages: linesToArray(draft.beverages),
    dailyReadings: linesToArray(draft.dailyReadings),
    prayerFocus: linesToArray(draft.prayerFocus),
    scriptureReference: draft.scriptureReference.trim() || undefined,
    safetyNote: draft.safetyNote.trim() || undefined,
    dayInstructions: {
      always: linesToArray(draft.alwaysInstructions),
      fast: linesToArray(draft.fastInstructions),
      nonFast: linesToArray(draft.nonFastInstructions),
    },
  };

  return withGeneratedScheduleSummary(content);
}

function draftFromContent(content: CustomPhaseContent, durationDays: number): PhaseDraft {
  const pattern = content.schedulePattern;
  const preset: SchedulePreset =
    pattern.kind === 'normal-eating'
      ? 'normal'
      : pattern.kind === 'consecutive-daniel'
        ? 'daniel'
        : pattern.kind === 'weekday-with-prayer'
          ? 'prayer'
          : 'weekly';

  return {
    ...defaultPhaseDraft(),
    id: createDraftId(),
    title: content.title,
    durationDays,
    themeColor: content.themeColor || '#5f6f52',
    schedulePreset: preset,
    fastDays:
      pattern.kind === 'weekday-fast' || pattern.kind === 'weekday-with-prayer'
        ? pattern.fastDays
        : pattern.kind === 'rotating-weekly'
          ? [...new Set(pattern.weeks.map((week) => week.dayOfWeek))]
          : [3],
    fastType:
      pattern.kind === 'weekday-fast' || pattern.kind === 'weekday-with-prayer'
        ? pattern.fastType
        : pattern.kind === 'rotating-weekly'
          ? pattern.weeks[0]?.fastType ?? 'sunrise-to-sunset-water'
          : 'sunrise-to-sunset-water',
    prayerDays: pattern.kind === 'weekday-with-prayer' ? pattern.prayerDays : [6],
    includesWalk: pattern.kind === 'consecutive-daniel' ? Boolean(pattern.includesWalk) : false,
    allowed: arrayToLines(content.allowed),
    avoid: arrayToLines(content.avoid),
    beverages: arrayToLines(content.beverages),
    dailyReadings: arrayToLines(content.dailyReadings),
    prayerFocus: arrayToLines(content.prayerFocus),
    scriptureReference: content.scriptureReference ?? '',
    safetyNote: content.safetyNote ?? '',
    alwaysInstructions: arrayToLines(content.dayInstructions?.always),
    fastInstructions: arrayToLines(content.dayInstructions?.fast),
    nonFastInstructions: arrayToLines(content.dayInstructions?.nonFast),
  };
}

function contentFromTemplate(template: NonNullable<ReturnType<typeof getTemplateById>>): CustomPhaseContent {
  return {
    title: template.title,
    themeColor: template.themeColor,
    schedulePattern: template.schedulePattern,
    allowed: template.allowed,
    avoid: template.avoid,
    beverages: template.beverages,
    dailyReadings: template.dailyReadings,
    prayerFocus: template.prayerFocus,
    scriptureReference: template.scriptureReference,
    safetyNote: template.safetyNote,
    scheduleSummary: template.scheduleSummary,
  };
}

function draftFromTemplatePhase(phase: JourneyPhase, startDate: string, endDate: string): PhaseDraft | null {
  if (isCustomJourneyPhase(phase)) {
    const remainingStart = startDate > phase.startDate ? startDate : phase.startDate;
    return draftFromContent(phase.content, daysBetween(remainingStart, endDate));
  }

  const template = getTemplateById(phase.templateId);
  if (!template) return null;
  return draftFromContent(contentFromTemplate(template), daysBetween(startDate, endDate));
}

function buildCustomPhases(startDate: string, drafts: PhaseDraft[], startingOrder = 0): JourneyPhase[] {
  let cursor = startDate;
  return drafts.map((draft, index) => {
    const endDate = addLocalDays(cursor, Math.max(1, draft.durationDays) - 1);
    const phase: JourneyPhase = {
      order: startingOrder + index,
      startDate: cursor,
      endDate,
      content: contentFromDraft(draft),
    };
    cursor = addLocalDays(endDate, 1);
    return phase;
  });
}

function mergeTodayForward(existing: Journey, draft: Journey, editStart: string): Journey {
  const existingWindows = getJourneyPhaseWindows(existing);
  if (editStart <= existing.startDate || existingWindows.length === 0) return draft;
  if (editStart > existingWindows[existingWindows.length - 1].endDate) return draft;

  const dayBeforeEdit = addLocalDays(editStart, -1);
  const kept: JourneyPhase[] = [];
  let replacementStart = editStart;

  for (const window of existingWindows) {
    if (window.endDate < editStart) {
      kept.push({ ...window.phase, order: kept.length });
      continue;
    }

    if (window.startDate < editStart) {
      if (isCustomJourneyPhase(window.phase)) {
        kept.push({
          ...window.phase,
          endDate: dayBeforeEdit,
          order: kept.length,
        });
      } else {
        const template = window.templateId ? getTemplateById(window.templateId) : null;
        if (template) {
          kept.push({
            order: kept.length,
            startDate: window.startDate,
            endDate: dayBeforeEdit,
            content: withGeneratedScheduleSummary(contentFromTemplate(template)),
          });
        }
      }
    }
    break;
  }

  const futureDrafts = draft.phases.filter(isCustomJourneyPhase).map((phase) =>
    draftFromContent(phase.content, daysBetween(phase.startDate, phase.endDate)),
  );
  const future = buildCustomPhases(replacementStart, futureDrafts, kept.length);

  return {
    ...existing,
    name: draft.name,
    phases: [...kept, ...future],
  };
}

function getInitialBuilderState(initialJourney?: Journey | null): {
  journeyId: string;
  name: string;
  startDate: string;
  phases: PhaseDraft[];
} {
  if (!initialJourney) {
    return {
      journeyId: createJourneyId(),
      name: '',
      startDate: getLocalDateString(),
      phases: [defaultPhaseDraft()],
    };
  }

  const today = getLocalDateString();
  const windows = getJourneyPhaseWindows(initialJourney);
  const planEnd = windows[windows.length - 1]?.endDate ?? initialJourney.startDate;
  const editStart =
    today < initialJourney.startDate
      ? initialJourney.startDate
      : today > planEnd
        ? today
        : today;
  const drafts = windows
    .filter((window) => window.endDate >= editStart)
    .map((window) => draftFromTemplatePhase(window.phase, editStart, window.endDate))
    .filter((draft): draft is PhaseDraft => Boolean(draft));

  return {
    journeyId: initialJourney.id,
    name: initialJourney.name,
    startDate: editStart,
    phases: drafts.length ? drafts : [defaultPhaseDraft()],
  };
}

export function JourneyBuilder({
  open,
  onClose,
  onComplete,
  confirmLabel,
  title,
  initialJourney,
}: Props) {
  const [step, setStep] = useState(0);
  const [journeyId, setJourneyId] = useState(createJourneyId());
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [phases, setPhases] = useState<PhaseDraft[]>(() => [defaultPhaseDraft()]);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    trackEvent('custom_journey_builder_opened', {
      is_edit: Boolean(initialJourney),
      context: onComplete ? 'group' : 'settings',
    });
    const initial = getInitialBuilderState(initialJourney);
    setJourneyId(initial.journeyId);
    setName(initial.name);
    setStartDate(initial.startDate);
    setPhases(initial.phases);
    setActivePhaseIndex(0);
    setStep(0);
  }, [initialJourney, open]);

  const draftJourney = useMemo((): Journey | null => {
    if (!name.trim() || phases.length === 0) return null;
    if (
      phases.some(
        (phase) =>
          !phase.title.trim() ||
          linesToArray(phase.prayerFocus).length === 0 ||
          phase.durationDays < 1,
      )
    ) {
      return null;
    }
    return {
      id: journeyId,
      name: name.trim(),
      startDate,
      phases: buildCustomPhases(startDate, phases),
    };
  }, [journeyId, name, phases, startDate]);

  const windows = draftJourney ? getJourneyPhaseWindows(draftJourney) : [];
  const activePhase = phases[activePhaseIndex] ?? phases[0];

  if (!open) return null;

  const updatePhase = (index: number, updates: Partial<PhaseDraft>) => {
    setPhases((prev) => prev.map((phase, i) => (i === index ? { ...phase, ...updates } : phase)));
  };

  const toggleDay = (field: 'fastDays' | 'prayerDays', day: number) => {
    if (!activePhase) return;
    const current = activePhase[field];
    const next = current.includes(day)
      ? current.filter((item) => item !== day)
      : [...current, day].sort((a, b) => a - b);
    updatePhase(activePhaseIndex, field === 'fastDays' ? { fastDays: next } : { prayerDays: next });
  };

  const movePhase = (index: number, direction: -1 | 1) => {
    setPhases((prev) => {
      if (index < 0) return prev;
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      setActivePhaseIndex(target);
      return next;
    });
  };

  const resetForm = () => {
    const initial = getInitialBuilderState(initialJourney);
    setStep(0);
    setJourneyId(initial.journeyId);
    setName(initial.name);
    setStartDate(initial.startDate);
    setPhases(initial.phases);
    setActivePhaseIndex(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleConfirm = async () => {
    if (!draftJourney) return;
    const journeyToSave = initialJourney
      ? mergeTodayForward(initialJourney, draftJourney, startDate)
      : draftJourney;
    setBusy(true);
    try {
      if (onComplete) {
        await onComplete(journeyToSave);
      } else {
        saveJourney(journeyToSave);
        setActiveJourney(journeyToSave.id);
        toast.success(initialJourney ? 'Journey updated from today forward.' : 'Custom journey saved.');
      }
      trackEvent('custom_journey_saved', {
        phase_count: journeyToSave.phases.length,
        is_update: Boolean(initialJourney),
        context: onComplete ? 'group' : 'settings',
      });
      onClose();
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save journey.');
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  const backButtonClass =
    'flex-1 rounded-xl bg-surface-container px-4 py-3 text-body-md text-on-surface';

  const textAreaClass = `${inputClass} min-h-24`;

  const addPhase = () => {
    setPhases((prev) => {
      const next = [...prev, defaultPhaseDraft(prev.length)];
      setActivePhaseIndex(next.length - 1);
      return next;
    });
  };

  const removeActivePhase = () => {
    if (phases.length <= 1) return;
    setPhases((prev) => prev.filter((_, index) => index !== activePhaseIndex));
    setActivePhaseIndex((prev) => Math.max(0, prev - 1));
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:items-center sm:pb-4">
      <div
        className="flex max-h-[min(90vh,calc(100dvh-6rem))] w-full max-w-lg flex-col rounded-2xl bg-surface-container-lowest shadow-grace-up sm:max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="journey-builder-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-surface-variant px-gutter py-4">
          <h2 id="journey-builder-title" className="font-display text-headline-md text-primary">
            {title ?? (initialJourney ? 'Edit Journey' : 'Create Journey')}
          </h2>
          <button type="button" onClick={handleClose} className="rounded-lg p-2 hover:bg-surface-container">
            <Icon name="close" />
          </button>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-gutter">
          {step === 0 && (
            <div className="space-y-4">
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
              <label className="block min-w-0">
                <span className="mb-1 block text-body-md text-on-surface">
                  {initialJourney ? 'Edit from date' : 'Start date'}
                </span>
                <div className="min-w-0 overflow-hidden rounded-xl">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      if (!initialJourney) setStartDate(e.target.value);
                    }}
                    readOnly={Boolean(initialJourney)}
                    disabled={Boolean(initialJourney)}
                    className={`date-input ${inputClass}`}
                  />
                </div>
              </label>
              {initialJourney ? (
                <p className="rounded-xl bg-secondary-container/40 p-3 text-body-sm text-on-secondary-container">
                  Edits are applied from today forward so past check-ins and phase history stay intact.
                </p>
              ) : null}
              <p className="rounded-xl bg-secondary-container/40 p-3 text-body-sm text-on-secondary-container">
                Custom phases are auto-chained with no gaps. Choose a duration for each phase and
                Fasted will calculate the date ranges.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-body-md text-on-surface-variant">
                Build each phase with a schedule preset, food rules, prayer focus, and optional
                daily instruction overrides.
              </p>
              <div className="flex flex-wrap gap-2">
                {phases.map((phase, index) => (
                  <button
                    key={phase.id}
                    type="button"
                    onClick={() => setActivePhaseIndex(index)}
                    className={`rounded-full px-3 py-1 text-label-caps ${
                      index === activePhaseIndex
                        ? 'bg-primary text-on-primary'
                        : 'bg-secondary-container text-on-secondary-container'
                    }`}
                  >
                    Phase {index + 1}
                  </button>
                ))}
              </div>

              {activePhase && (
                <div className="space-y-4 rounded-xl border border-surface-variant bg-surface-container-low p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-headline-sm text-primary">
                      Phase {activePhaseIndex + 1}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => movePhase(activePhaseIndex, -1)}
                        aria-label="Move phase up"
                        className="rounded-lg bg-surface-container p-2"
                      >
                        <Icon name="arrow_upward" size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhase(activePhaseIndex, 1)}
                        aria-label="Move phase down"
                        className="rounded-lg bg-surface-container p-2"
                      >
                        <Icon name="arrow_downward" size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={removeActivePhase}
                        disabled={phases.length <= 1}
                        aria-label="Remove phase"
                        className="rounded-lg bg-surface-container p-2 disabled:opacity-40"
                      >
                        <Icon name="close" size={18} />
                      </button>
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-body-md text-on-surface">Phase title</span>
                    <input
                      type="text"
                      value={activePhase.title}
                      onChange={(e) => updatePhase(activePhaseIndex, { title: e.target.value })}
                      className={inputClass}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="block">
                      <span className="mb-1 block text-body-md text-on-surface">Duration (days)</span>
                      <PhaseDurationDaysField
                        phaseId={activePhase.id}
                        durationDays={activePhase.durationDays}
                        onChange={(durationDays) =>
                          updatePhase(activePhaseIndex, { durationDays })
                        }
                        onInvalid={() => updatePhase(activePhaseIndex, { durationDays: 0 })}
                      />
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-body-md text-on-surface">Theme color</span>
                      <input
                        type="color"
                        value={activePhase.themeColor}
                        onChange={(e) => updatePhase(activePhaseIndex, { themeColor: e.target.value })}
                        className="h-[50px] w-full rounded-xl border border-outline-variant bg-surface-container-low p-2"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-body-md text-on-surface">Schedule preset</span>
                    <select
                      value={activePhase.schedulePreset}
                      onChange={(e) =>
                        updatePhase(activePhaseIndex, { schedulePreset: e.target.value as SchedulePreset })
                      }
                      className={inputClass}
                    >
                      <option value="normal">Normal eating (whole phase)</option>
                      <option value="weekly">Weekly fast day(s)</option>
                      <option value="daniel">Daniel fast (whole phase)</option>
                      <option value="prayer">Fast + prayer days</option>
                    </select>
                  </label>

                  {activePhase.schedulePreset !== 'normal' && activePhase.schedulePreset !== 'daniel' && (
                    <fieldset>
                      <legend className="mb-2 text-body-md text-on-surface">Fast days</legend>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAY_OPTIONS.map((day) => (
                          <label key={day.value} className="flex items-center gap-1 rounded-lg bg-surface-container px-2 py-1 text-body-sm">
                            <input
                              type="checkbox"
                              checked={activePhase.fastDays.includes(day.value)}
                              onChange={() => toggleDay('fastDays', day.value)}
                            />
                            {day.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {(activePhase.schedulePreset === 'weekly' ||
                    activePhase.schedulePreset === 'prayer') && (
                    <label className="block">
                      <span className="mb-1 block text-body-md text-on-surface">Fast type</span>
                      <select
                        value={activePhase.fastType}
                        onChange={(e) => updatePhase(activePhaseIndex, { fastType: e.target.value as FastType })}
                        className={inputClass}
                      >
                        {FAST_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {activePhase.schedulePreset === 'prayer' && (
                    <fieldset>
                      <legend className="mb-2 text-body-md text-on-surface">Extended prayer days</legend>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAY_OPTIONS.map((day) => (
                          <label key={day.value} className="flex items-center gap-1 rounded-lg bg-surface-container px-2 py-1 text-body-sm">
                            <input
                              type="checkbox"
                              checked={activePhase.prayerDays.includes(day.value)}
                              onChange={() => toggleDay('prayerDays', day.value)}
                            />
                            {day.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {activePhase.schedulePreset === 'daniel' && (
                    <label className="flex items-center gap-2 text-body-md text-on-surface">
                      <input
                        type="checkbox"
                        checked={activePhase.includesWalk}
                        onChange={(e) => updatePhase(activePhaseIndex, { includesWalk: e.target.checked })}
                      />
                      Include a daily walk
                    </label>
                  )}

                  <label className="block">
                    <span className="mb-1 block text-body-md text-on-surface">Prayer focus (required)</span>
                    <textarea
                      value={activePhase.prayerFocus}
                      onChange={(e) => updatePhase(activePhaseIndex, { prayerFocus: e.target.value })}
                      className={textAreaClass}
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-body-md text-on-surface">Allowed foods</span>
                      <textarea
                        value={activePhase.allowed}
                        onChange={(e) => updatePhase(activePhaseIndex, { allowed: e.target.value })}
                        className={textAreaClass}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-body-md text-on-surface">Avoid foods</span>
                      <textarea
                        value={activePhase.avoid}
                        onChange={(e) => updatePhase(activePhaseIndex, { avoid: e.target.value })}
                        className={textAreaClass}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-body-md text-on-surface">Beverages</span>
                      <textarea
                        value={activePhase.beverages}
                        onChange={(e) => updatePhase(activePhaseIndex, { beverages: e.target.value })}
                        className={textAreaClass}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-body-md text-on-surface">Daily readings</span>
                      <textarea
                        value={activePhase.dailyReadings}
                        onChange={(e) => updatePhase(activePhaseIndex, { dailyReadings: e.target.value })}
                        className={textAreaClass}
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-body-md text-on-surface">Scripture reference</span>
                    <input
                      type="text"
                      value={activePhase.scriptureReference}
                      onChange={(e) => updatePhase(activePhaseIndex, { scriptureReference: e.target.value })}
                      className={inputClass}
                    />
                  </label>

                  <details className="rounded-xl bg-surface-container p-3">
                    <summary className="cursor-pointer text-body-md text-primary">
                      Optional instruction overrides
                    </summary>
                    <div className="mt-3 space-y-3">
                      <label className="block">
                        <span className="mb-1 block text-body-md text-on-surface">Instructions every day</span>
                        <textarea
                          value={activePhase.alwaysInstructions}
                          onChange={(e) => updatePhase(activePhaseIndex, { alwaysInstructions: e.target.value })}
                          className={textAreaClass}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-body-md text-on-surface">Fast day instructions</span>
                        <textarea
                          value={activePhase.fastInstructions}
                          onChange={(e) => updatePhase(activePhaseIndex, { fastInstructions: e.target.value })}
                          className={textAreaClass}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-body-md text-on-surface">Non-fast day instructions</span>
                        <textarea
                          value={activePhase.nonFastInstructions}
                          onChange={(e) => updatePhase(activePhaseIndex, { nonFastInstructions: e.target.value })}
                          className={textAreaClass}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-body-md text-on-surface">Safety note</span>
                        <textarea
                          value={activePhase.safetyNote}
                          onChange={(e) => updatePhase(activePhaseIndex, { safetyNote: e.target.value })}
                          className={textAreaClass}
                        />
                      </label>
                    </div>
                  </details>

                  <p className="rounded-xl bg-surface-container p-3 text-body-sm text-on-surface-variant">
                    Summary preview: {generateScheduleSummary(contentFromDraft(activePhase))}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={addPhase}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary-container px-4 py-3 text-body-md text-on-secondary-container"
              >
                <Icon name="add" size={18} />
                Add another phase
              </button>
            </div>
          )}

          {step === 2 && draftJourney && (
            <>
              <p className="text-body-md text-on-surface">
                <strong>{draftJourney.name}</strong> starts {formatDisplayDate(startDate)}.
              </p>
              <ul className="mt-4 space-y-2">
                {windows.map((window, index) => {
                  const phase = draftJourney.phases[index];
                  const titleText = isCustomJourneyPhase(phase) ? phase.content.title : undefined;
                  return (
                    <li
                      key={`${window.startDate}-${window.order}`}
                      className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3 text-body-md"
                    >
                      <span
                        className="h-12 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: isCustomJourneyPhase(phase) ? phase.content.themeColor : undefined }}
                        aria-hidden
                      />
                      <div>
                        <p>{titleText}</p>
                        <p className="text-label-caps text-on-surface-variant">
                          {formatDisplayDate(window.startDate)} – {formatDisplayDate(window.endDate)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-surface-variant p-gutter pb-[env(safe-area-inset-bottom)]">
          {step === 0 && (
            <LoadingButton
              type="button"
              disabled={!name.trim() || !startDate}
              onClick={() => setStep(1)}
              className="w-full"
            >
              Next
            </LoadingButton>
          )}

          {step === 1 && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(0)} className={backButtonClass}>
                Back
              </button>
              <LoadingButton
                type="button"
                disabled={!draftJourney}
                onClick={() => setStep(2)}
                className="flex-1"
              >
                Review
              </LoadingButton>
            </div>
          )}

          {step === 2 && draftJourney && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className={backButtonClass}>
                Back
              </button>
              <LoadingButton type="button" loading={busy} onClick={() => void handleConfirm()} className="flex-1">
                {confirmLabel ?? (initialJourney ? 'Save Journey' : 'Start Journey')}
              </LoadingButton>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
