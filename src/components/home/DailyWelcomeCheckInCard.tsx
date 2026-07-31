import { useState } from 'react';
import type {
  ArrivalMood,
  CommitmentLevel,
  DailyChallenge,
  DailyIntention,
} from '../../types';
import { saveDailyWelcomeCheckIn } from '../../lib/storage';
import {
  ARRIVAL_MOOD_OPTIONS,
  CHALLENGE_OPTIONS,
  COMMITMENT_OPTIONS,
  getTimeGreeting,
  INTENTION_OPTIONS,
} from '../../lib/homeScreenLabels';

type Props = {
  date: string;
};

type Step = 'mood' | 'commitment' | 'challenge' | 'intention';

export function DailyWelcomeCheckInCard({ date }: Props) {
  const [step, setStep] = useState<Step>('mood');
  const [arrivalMood, setArrivalMood] = useState<ArrivalMood | null>(null);
  const [commitmentLevel, setCommitmentLevel] = useState<CommitmentLevel | null>(null);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [intention, setIntention] = useState<DailyIntention | null>(null);

  const finish = (_finalIntention: DailyIntention | null) => {
    if (!arrivalMood || !commitmentLevel) return;

    saveDailyWelcomeCheckIn({
      date,
      completedAt: new Date().toISOString(),
    });
  };

  return (
    <section
      className="stitch-card space-y-stack-lg p-stack-lg"
      aria-labelledby="daily-welcome-heading"
      data-testid="daily-welcome-checkin"
    >
      <header className="text-center">
        <p className="label-caps text-secondary">{getTimeGreeting()}!</p>
        <h2 id="daily-welcome-heading" className="mt-2 font-display text-headline-lg-mobile text-primary">
          How are you arriving today?
        </h2>
      </header>

      {step === 'mood' && (
        <div className="space-y-stack-md">
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            role="radiogroup"
            aria-label="How are you arriving today?"
          >
            {ARRIVAL_MOOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={arrivalMood === option.value}
                onClick={() => {
                  setArrivalMood(option.value);
                  setStep('commitment');
                }}
                className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl border px-3 py-4 text-center transition-all active:scale-[0.98] ${
                  arrivalMood === option.value
                    ? 'border-secondary bg-secondary-container/30'
                    : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container-high'
                }`}
              >
                <span className="text-2xl" aria-hidden>
                  {option.emoji}
                </span>
                <span className="text-body-md font-medium text-primary">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'commitment' && (
        <div className="space-y-stack-md">
          <h3 className="text-center font-display text-headline-md text-primary">
            How committed do you feel today?
          </h3>
          <div
            className="grid grid-cols-1 gap-3"
            role="radiogroup"
            aria-label="How committed do you feel today?"
          >
            {COMMITMENT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={commitmentLevel === option.value}
                onClick={() => {
                  setCommitmentLevel(option.value);
                  setStep('challenge');
                }}
                className={`flex min-h-[3.5rem] items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.98] ${
                  commitmentLevel === option.value
                    ? 'border-secondary bg-secondary-container/30'
                    : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container-high'
                }`}
              >
                <span className="text-xl" aria-hidden>
                  {option.emoji}
                </span>
                <span className="text-body-lg font-medium text-primary">{option.label}</span>
              </button>
            ))}
          </div>
          {commitmentLevel === 'worried' && (
            <p className="rounded-xl bg-secondary-container/20 px-4 py-3 text-body-md leading-relaxed text-on-surface-variant">
              God&apos;s grace is new every morning. Take one step at a time—hydrate, pray briefly,
              and return to scripture when hunger rises.
            </p>
          )}
        </div>
      )}

      {step === 'challenge' && (
        <div className="space-y-stack-md">
          <h3 className="text-center font-display text-headline-md text-primary">
            What&apos;s your biggest challenge today?
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {CHALLENGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setChallenge(option.value);
                  setStep('intention');
                }}
                className={`rounded-full border px-4 py-2.5 text-body-md font-medium transition-all active:scale-[0.98] ${
                  challenge === option.value
                    ? 'border-secondary bg-secondary-container text-on-secondary-container'
                    : 'border-outline-variant/40 bg-surface-container-low text-primary hover:bg-surface-container-high'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep('intention')}
            className="mx-auto block text-body-md text-on-surface-variant underline"
          >
            Skip for now
          </button>
        </div>
      )}

      {step === 'intention' && (
        <div className="space-y-stack-md">
          <h3 className="text-center font-display text-headline-md text-primary">
            Today&apos;s intention
          </h3>
          <p className="text-center text-body-md text-on-surface-variant">I want to…</p>
          <div className="grid grid-cols-1 gap-2">
            {INTENTION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setIntention(option.value);
                  finish(option.value);
                }}
                className="btn-stitch-secondary w-full text-left"
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => finish(intention)}
            className="mx-auto block text-body-md text-on-surface-variant underline"
          >
            Skip for now
          </button>
        </div>
      )}
    </section>
  );
}
