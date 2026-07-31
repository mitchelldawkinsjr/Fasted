import { useEffect, useRef } from 'react';
import type { DailyFastPlan } from '../../types';
import {
  GUIDED_JOURNEY_STEP_ORDER,
  advanceGuidedJourneyStep,
  startGuidedJourney,
} from '../../lib/storage';
import type { GuidedJourneyStepId } from '../../types';
import { useProgress } from '../../hooks/useProgress';
import { DailyReflection } from '../DailyReflection';
import { Icon } from '../Icon';
import { PrayerPointsCard } from '../PrayerPointsCard';
import { VerseOfTheDay } from '../VerseOfTheDay';

type Props = {
  date: string;
  plan: DailyFastPlan;
  onClose: () => void;
};

const STEP_LABELS: Record<GuidedJourneyStepId, string> = {
  scripture: "Today's Scripture",
  meditation: "Today's Meditation",
  prayer: 'Prayer Focus',
  reflection: 'Morning Reflection',
};

export function GuidedJourneyFlow({ date, plan, onClose }: Props) {
  const progress = useProgress();
  const dialogRef = useRef<HTMLDivElement>(null);
  const journeyProgress = progress.guidedJourneyProgress?.[date];
  const currentStep = journeyProgress?.currentStep ?? 'scripture';
  const stepIndex = GUIDED_JOURNEY_STEP_ORDER.indexOf(currentStep);

  useEffect(() => {
    if (!journeyProgress) {
      startGuidedJourney(date);
    }
  }, [date, journeyProgress]);

  useEffect(() => {
    dialogRef.current?.focus();
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleContinue = () => {
    advanceGuidedJourneyStep(date);
  };

  const isReflectionStep = currentStep === 'reflection';
  const isVerseStep = currentStep === 'scripture' || currentStep === 'meditation';

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-journey-title"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-linen"
      data-testid="guided-journey-flow"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-outline-variant/30 px-4 py-3">
        <div>
          <p className="label-caps text-secondary">
            Step {stepIndex + 1} of {GUIDED_JOURNEY_STEP_ORDER.length}
          </p>
          <h2 id="guided-journey-title" className="font-display text-headline-md text-primary">
            {STEP_LABELS[currentStep]}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high"
          aria-label="Close guided journey"
        >
          <Icon name="close" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-20">
        <div className="mx-auto max-w-lg space-y-stack-lg">
          {isVerseStep && (
            <section aria-label={STEP_LABELS[currentStep]}>
              <VerseOfTheDay date={date} variant="today" />
              {currentStep === 'meditation' && (
                <p className="mt-stack-md text-center text-body-md text-on-surface-variant">
                  Take a quiet moment with today&apos;s verse before continuing.
                </p>
              )}
            </section>
          )}

          {currentStep === 'prayer' && (
            <PrayerPointsCard
              points={plan.prayerPoints}
              encouragement="You are setting this time apart for something greater."
            />
          )}

          {isReflectionStep && (
            <section
              id="daily-reflection"
              data-tour="morning-reflection"
              aria-labelledby="guided-reflection-heading"
            >
              <h3
                id="guided-reflection-heading"
                className="mb-stack-md font-display text-headline-md text-primary"
              >
                Morning Reflection
              </h3>
              <DailyReflection date={date} layout="guided" />
            </section>
          )}
        </div>
      </div>

      {!isReflectionStep && (
        <footer className="shrink-0 border-t border-outline-variant/30 bg-linen p-4">
          <button
            type="button"
            onClick={handleContinue}
            className="btn-stitch-primary w-full"
            data-testid="guided-journey-continue"
          >
            Continue
          </button>
        </footer>
      )}
    </div>
  );
}
