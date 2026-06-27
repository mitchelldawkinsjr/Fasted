import { useState } from 'react';
import { useActiveJourney } from '../hooks/useActiveJourney';
import type { DailyFastPlan } from '../types';
import { formatDisplayDate, getAllPlanDates } from '../lib/dateUtils';
import { Icon } from './Icon';
import { ImageLightbox } from './ImageLightbox';

type Props = {
  plan: DailyFastPlan;
};

const FAST_TYPE_LABELS: Record<DailyFastPlan['fastType'], string> = {
  'normal-eating': 'Preparation / Normal Eating Day',
  'sunrise-to-sunset-water': 'Fast Day: Water Only',
  'sunrise-to-sunset-with-coffee-tea': 'Fast Day: Water, Coffee & Tea',
  'daniel-fast': 'Daniel Fast Day',
  'twenty-four-hour-water': '24-Hour Water Fast',
  'extended-prayer': 'Extended Prayer Day',
};

export function TodayFastCard({ plan }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { phases, planStart, planEnd, journey } = useActiveJourney();
  const phase = phases.find((p) => p.id === plan.phaseId);
  const planDates = getAllPlanDates(journey);
  const totalDays = planDates.length;
  const dayNumber = planDates.findIndex((d) => d === plan.date) + 1;

  return (
    <section className="space-y-stack-lg animate-fade-in-up">
      <header>
        <span className="label-caps text-secondary">
          Phase {plan.phaseId}: {phase?.title}
        </span>
        <h2 className="mt-1 font-display text-headline-lg-mobile text-primary">
          {formatDisplayDate(plan.date)}
        </h2>
      </header>

      <button
        type="button"
        onClick={() => phase?.imagePath && setLightboxOpen(true)}
        className="group relative block h-64 w-full cursor-pointer overflow-hidden rounded-xl grace-shadow text-left transition-transform active:scale-[0.99] md:h-72"
        aria-label={`View ${phase?.title ?? 'phase'} image`}
      >
        {phase?.imagePath && (
          <img
            src={phase.imagePath}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${phase?.themeColor ?? '#173d00'}88 0%, #173d00 50%, #092100 100%)`,
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/10"
          aria-hidden
        />
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <p className="label-caps mb-1 opacity-90">CURRENT STATUS</p>
          <p className="font-display text-headline-md">{FAST_TYPE_LABELS[plan.fastType]}</p>
        </div>
        <div className="absolute right-4 top-4 flex items-start gap-2">
          <span className="rounded-full bg-black/30 p-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Icon name="zoom_in" size={20} className="text-white" />
          </span>
          <span className="opacity-30">
            <Icon name={plan.isFastDay ? 'water_drop' : 'eco'} size={64} />
          </span>
        </div>
      </button>

      {lightboxOpen && phase?.imagePath && (
        <ImageLightbox
          src={phase.imagePath}
          alt={`${phase.title} phase illustration`}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <div
        className="stitch-card border-l-4 p-stack-lg"
        style={{ borderLeftColor: phase?.themeColor ?? '#fed65b' }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Icon name={plan.isFastDay ? 'water_drop' : 'eco'} className="text-secondary" />
          <p className="font-display text-headline-md text-primary">Today&apos;s Instructions</p>
        </div>
        <ul className="space-y-2 text-body-md leading-relaxed text-on-surface-variant">
          {plan.instructions.map((instruction) => (
            <li key={instruction} className="flex items-start gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-secondary" aria-hidden />
              {instruction}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-label-caps text-on-surface-variant">
        Day {dayNumber} of {totalDays} · {planStart} – {planEnd}
      </p>
    </section>
  );
}
