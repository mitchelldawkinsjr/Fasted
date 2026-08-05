import { useEffect, useRef, useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import {
  DAILY_REFLECTION_FIELDS_AFTER_MOOD,
  DAILY_REFLECTION_FIELDS_BEFORE_MOOD,
} from '../../lib/journalTags';
import { messages } from '../../lib/messages';
import { toast } from '../../lib/toast';
import {
  CHECK_IN_COMMITMENTS,
  TODAY_COMMITMENTS_HEADING,
  TODAY_COMMITMENTS_SUBTITLE,
} from '../../lib/checkInCommitments';
import type { CommitmentResult, DayMood, FastPhase } from '../../types';
import type { GroupCommitmentContext } from '../../hooks/useGroupCommitmentContexts';
import { GroupCommitmentRows } from '../GroupCommitmentRows';
import { InfoBanner } from '../InfoBanner';
import { LoadingButton } from '../LoadingButton';
import { MoodPicker } from '../MoodPicker';
import { PrayerPointsCard } from '../PrayerPointsCard';
import { VerseOfTheDay } from '../VerseOfTheDay';

type ReflectionFieldKey =
  | (typeof DAILY_REFLECTION_FIELDS_BEFORE_MOOD)[number]['key']
  | (typeof DAILY_REFLECTION_FIELDS_AFTER_MOOD)[number]['key'];

type GuidedReflectionStep =
  | { kind: 'meditation' }
  | { kind: 'field'; key: ReflectionFieldKey; label: string }
  | { kind: 'mood' }
  | { kind: 'prayer' }
  | { kind: 'commitments' }
  | { kind: 'groupCheckin' };

const BASE_GUIDED_REFLECTION_STEPS: GuidedReflectionStep[] = [
  { kind: 'commitments' },
  { kind: 'meditation' },
  ...DAILY_REFLECTION_FIELDS_BEFORE_MOOD.map(({ key, label }) => ({
    kind: 'field' as const,
    key,
    label,
  })),
  { kind: 'mood' },
  ...DAILY_REFLECTION_FIELDS_AFTER_MOOD.map(({ key, label }) => ({
    kind: 'field' as const,
    key,
    label,
  })),
  { kind: 'prayer' },
  { kind: 'groupCheckin' },
];

type Props = {
  date: string;
  prayerPoints: string[];
  phase: FastPhase | undefined;
  currentStreak: number;
  followedPlan: boolean;
  setFollowedPlan: Dispatch<SetStateAction<boolean>>;
  prayedFocus: boolean;
  setPrayedFocus: Dispatch<SetStateAction<boolean>>;
  readScripture: boolean;
  setReadScripture: Dispatch<SetStateAction<boolean>>;
  walkWithGod: boolean;
  setWalkWithGod: Dispatch<SetStateAction<boolean>>;
  dayMood: DayMood | null;
  setDayMood: Dispatch<SetStateAction<DayMood | null>>;
  fieldValues: Record<ReflectionFieldKey, string>;
  onFieldChange: (key: ReflectionFieldKey, value: string) => void;
  groupContexts: GroupCommitmentContext[];
  groupResults: Record<string, CommitmentResult[]>;
  setGroupResults: Dispatch<SetStateAction<Record<string, CommitmentResult[]>>>;
  saving: boolean;
  onSubmit: (event: FormEvent) => void;
};

function reflectionWordCount(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const GUIDED_QUESTION_TITLE_CLASS = 'mt-1 font-display text-headline-md text-primary';

function guidedQuestionTitle(step: GuidedReflectionStep): string | null {
  if (step.kind === 'field') return step.label;
  if (step.kind === 'mood') return 'How did today feel?';
  if (step.kind === 'commitments') return TODAY_COMMITMENTS_HEADING;
  if (step.kind === 'groupCheckin') return 'Group commitments';
  return null;
}

export function GuidedReflectionFlow({
  date,
  prayerPoints,
  phase,
  currentStreak,
  followedPlan,
  setFollowedPlan,
  prayedFocus,
  setPrayedFocus,
  readScripture,
  setReadScripture,
  walkWithGod,
  setWalkWithGod,
  dayMood,
  setDayMood,
  fieldValues,
  onFieldChange,
  groupContexts,
  groupResults,
  setGroupResults,
  saving,
  onSubmit,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const fieldTextareaRef = useRef<HTMLTextAreaElement>(null);
  const steps =
    groupContexts.length > 0
      ? BASE_GUIDED_REFLECTION_STEPS
      : BASE_GUIDED_REFLECTION_STEPS.filter((step) => step.kind !== 'groupCheckin');
  const commitmentState = {
    followedPlan: [followedPlan, setFollowedPlan] as const,
    prayedFocus: [prayedFocus, setPrayedFocus] as const,
    readScripture: [readScripture, setReadScripture] as const,
    walkWithGod: [walkWithGod, setWalkWithGod] as const,
  };
  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const isFieldStep = currentStep.kind === 'field';
  const questionTitle = guidedQuestionTitle(currentStep);

  useEffect(() => {
    if (!isFieldStep) return;
    fieldTextareaRef.current?.focus();
  }, [stepIndex, isFieldStep]);

  const handleContinue = () => {
    if (currentStep.kind === 'mood' && !dayMood) {
      toast.error(messages.errors.journalMoodRequired);
      return;
    }

    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex h-full min-h-0 flex-1 flex-col"
      noValidate
      data-testid="guided-daily-reflection"
    >
      <div className="shrink-0 pb-4">
        <p className="journal-focus-sans text-[14px] font-medium tracking-wide text-on-surface-variant">
          Question {stepIndex + 1} of {steps.length}
        </p>
        {questionTitle && (
          <h3 className={GUIDED_QUESTION_TITLE_CLASS}>{questionTitle}</h3>
        )}
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col overscroll-contain ${
          isFieldStep ? 'overflow-hidden' : 'justify-center overflow-y-auto py-2'
        }`}
      >
        <div
          className={`w-full ${
            isFieldStep ? 'flex min-h-0 flex-1 flex-col' : 'mx-auto max-w-lg'
          }`}
        >
          {currentStep.kind === 'meditation' && (
            <section aria-label="Today's Meditation" data-testid="meditation-step">
              <VerseOfTheDay date={date} variant="today" />
              <p className="mt-stack-md text-center text-body-md text-on-surface-variant">
                Take a quiet moment with today&apos;s verse before journaling.
              </p>
            </section>
          )}

          {currentStep.kind === 'prayer' && (
            <div data-testid="prayer-focus-step">
              <PrayerPointsCard
                points={prayerPoints}
                encouragement="You are setting this time apart for something greater."
              />
            </div>
          )}

          {isFieldStep && (
            <div className="flex min-h-0 flex-1 flex-col">
              <textarea
                ref={fieldTextareaRef}
                value={fieldValues[currentStep.key]}
                onChange={(event) => onFieldChange(currentStep.key, event.target.value)}
                placeholder="Start writing…"
                aria-label={currentStep.label}
                className="journal-focus-serif min-h-0 w-full flex-1 resize-none border-0 border-b border-outline-variant bg-transparent pb-2 text-[17px] leading-[1.6] text-on-surface placeholder:text-on-surface-variant/60 focus:border-on-surface focus:outline-none focus:ring-0"
              />
              <p className="journal-focus-sans mt-3 shrink-0 text-center text-[12px] font-medium text-on-surface-variant">
                {(() => {
                  const count = reflectionWordCount(fieldValues[currentStep.key]);
                  return count === 1 ? '1 word' : `${count} words`;
                })()}
              </p>
            </div>
          )}

          {currentStep.kind === 'mood' && (
            <MoodPicker value={dayMood} onChange={setDayMood} hideLegend className="px-1" />
          )}

          {currentStep.kind === 'commitments' && (
            <section
              aria-labelledby="daily-reflection-checkin-heading"
              className="space-y-stack-md"
            >
              <h4 id="daily-reflection-checkin-heading" className="sr-only">
                {TODAY_COMMITMENTS_HEADING}
              </h4>

              <p className="text-center text-body-md text-on-surface-variant">
                {TODAY_COMMITMENTS_SUBTITLE}
              </p>

              {phase && (
                <InfoBanner
                  variant="phase"
                  icon="flag"
                  className="px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-body-md"
                >
                  Phase {phase.id}: {phase.title}
                </InfoBanner>
              )}

              <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-center sm:px-4 sm:py-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant sm:font-label sm:text-label-caps sm:tracking-widest">
                  Check-in streak
                </span>
                <p className="font-display text-xl text-primary sm:mt-1 sm:text-headline-md">
                  {currentStreak}{' '}
                  <span className="text-xs font-normal text-on-surface-variant sm:text-body-md">
                    consecutive {currentStreak === 1 ? 'day' : 'days'}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {CHECK_IN_COMMITMENTS.map(({ key, label }) => (
                  <CheckRow
                    key={key}
                    label={label}
                    checked={commitmentState[key][0]}
                    onChange={commitmentState[key][1]}
                  />
                ))}
              </div>
            </section>
          )}

          {currentStep.kind === 'groupCheckin' && (
            <div className="space-y-4">
              {groupContexts.map((ctx) => (
                <section key={ctx.group.id}>
                  <h5 className="mb-2 label-caps text-secondary">
                    Group commitments · {ctx.group.name}
                  </h5>
                  <GroupCommitmentRows
                    commitments={ctx.commitments}
                    results={groupResults[ctx.group.id] ?? []}
                    onChange={(results) =>
                      setGroupResults((prev) => ({ ...prev, [ctx.group.id]: results }))
                    }
                  />
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-outline-variant/30 bg-linen pt-4">
        {isLastStep ? (
          <LoadingButton
            type="submit"
            loading={saving}
            loadingLabel="Saving…"
            className="w-full"
          >
            Save Reflection & Check-In
          </LoadingButton>
        ) : (
          <button
            type="button"
            onClick={handleContinue}
            className="btn-stitch-primary w-full"
            data-testid="guided-reflection-continue"
          >
            Continue
          </button>
        )}
      </footer>
    </form>
  );
}

export function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-low p-2 transition-colors hover:bg-surface-container-high sm:items-center sm:gap-3 sm:p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded accent-primary sm:mt-0"
      />
      <span className="text-xs leading-snug text-on-surface sm:text-body-md">{label}</span>
    </label>
  );
}
