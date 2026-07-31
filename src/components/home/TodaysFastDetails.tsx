import { useState } from 'react';
import type { DailyFastPlan, FastPhase } from '../../types';
import { FAST_TYPE_LABELS } from '../../lib/homeScreenLabels';
import { Icon } from '../Icon';
import { OverviewSection } from '../OverviewSection';

type Props = {
  plan: DailyFastPlan;
  phase: FastPhase | undefined;
};

export function TodaysFastDetails({ plan, phase }: Props) {
  const [expanded, setExpanded] = useState(false);
  const fastLabel = FAST_TYPE_LABELS[plan.fastType];

  return (
    <section className="stitch-card overflow-hidden" aria-labelledby="fast-details-heading">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls="fast-details-panel"
        className="flex w-full items-center justify-between gap-3 p-stack-lg text-left"
        data-testid="fast-details-toggle"
      >
        <div>
          <p className="label-caps text-on-surface-variant">Today&apos;s Fast</p>
          <h3 id="fast-details-heading" className="mt-1 font-display text-headline-md text-primary">
            {fastLabel}
          </h3>
        </div>
        <Icon name={expanded ? 'expand_less' : 'expand_more'} className="shrink-0 text-secondary" />
      </button>

      <div
        id="fast-details-panel"
        hidden={!expanded}
        className={`space-y-stack-md border-t border-outline-variant/20 px-stack-lg pb-stack-lg${expanded ? ' animate-fade-in-up' : ''}`}
      >
        {phase && (
          <OverviewSection
            phase={phase}
            fastTypeLabel={fastLabel}
            isFastDay={plan.isFastDay}
          />
        )}

        <div className="rounded-xl bg-surface-container-high/40 p-stack-md">
          <div className="mb-3 flex items-center gap-2">
            <Icon name={plan.isFastDay ? 'water_drop' : 'eco'} className="text-secondary" />
            <p className="font-display text-headline-sm text-primary">Instructions</p>
          </div>
          <ul
            data-testid="today-instructions-list"
            className="space-y-2 text-body-md leading-relaxed text-on-surface-variant"
          >
            {plan.instructions.map((instruction) => (
              <li key={instruction} className="flex items-start gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-secondary" aria-hidden />
                {instruction}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
