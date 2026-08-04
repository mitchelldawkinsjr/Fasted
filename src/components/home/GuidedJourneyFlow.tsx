import { useEffect, useRef } from 'react';
import type { DailyFastPlan } from '../../types';
import { startGuidedJourney } from '../../lib/storage';
import { DailyReflection } from '../DailyReflection';
import { Icon } from '../Icon';

type Props = {
  date: string;
  plan: DailyFastPlan;
  onClose: () => void;
};

export function GuidedJourneyFlow({ date, plan, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startGuidedJourney(date);
  }, [date]);

  useEffect(() => {
    dialogRef.current?.focus();
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-journey-title"
      tabIndex={-1}
      className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] top-[72px] z-[60] flex flex-col bg-linen"
      data-testid="guided-journey-flow"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-outline-variant/30 px-4 py-3">
        <div>
          <h2 id="guided-journey-title" className="font-display text-headline-md text-primary">
            Today&apos;s Journey
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <section
          id="daily-reflection"
          data-tour="morning-reflection"
          aria-labelledby="guided-journey-title"
          className="mx-auto flex min-h-0 w-full max-w-[680px] flex-1 flex-col px-1"
        >
          <DailyReflection
            date={date}
            layout="guided"
            prayerPoints={plan.prayerPoints}
          />
        </section>
      </div>
    </div>
  );
}
