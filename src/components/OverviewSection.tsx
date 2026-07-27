import { useState } from 'react';
import type { FastPhase } from '../types';
import { Icon } from './Icon';
import { ImageLightbox } from './ImageLightbox';

type Props = {
  phase: FastPhase;
  fastTypeLabel: string;
  isFastDay: boolean;
};

function OverviewBlock({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon name={icon} className="text-secondary" size={20} />
        <h4 className="font-display text-headline-sm text-primary">{title}</h4>
      </div>
      <div className="text-body-md leading-relaxed text-on-surface-variant">{children}</div>
    </section>
  );
}

export function OverviewSection({ phase, fastTypeLabel, isFastDay }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <div className="space-y-stack-md">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls="phase-overview-panel"
        className="group relative block h-64 w-full cursor-pointer overflow-hidden rounded-xl grace-shadow text-left transition-transform hover:ring-2 hover:ring-secondary/60 active:scale-[0.99] md:h-72"
        aria-label={`${expanded ? 'Hide' : 'Show'} ${phase.title} phase overview`}
        data-testid="phase-overview-toggle"
      >
        {phase.imagePath && (
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
            background: `linear-gradient(135deg, ${phase.themeColor ?? '#173d00'}88 0%, #173d00 50%, #092100 100%)`,
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10"
          aria-hidden
        />
        <div className="absolute bottom-6 left-6 right-6 text-white">
          <p className="label-caps mb-1 opacity-90">CURRENT STATUS</p>
          <p className="font-display text-headline-md">{fastTypeLabel}</p>
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-label-caps backdrop-blur-sm transition-colors group-hover:bg-white/25">
            Click for overview
            <Icon name={expanded ? 'expand_less' : 'expand_more'} size={16} />
          </p>
        </div>
        <div className="absolute right-4 top-4 opacity-30">
          <Icon name={isFastDay ? 'water_drop' : 'eco'} size={64} />
        </div>
      </button>

      <div
        id="phase-overview-panel"
        hidden={!expanded}
        className={`stitch-card space-y-stack-md p-stack-lg${expanded ? ' animate-fade-in-up' : ''}`}
        data-testid="phase-overview-panel"
      >
        <h3 className="font-display text-headline-md text-primary">Phase Overview</h3>

          <OverviewBlock icon="menu_book" title="Scripture">
            <p className="font-medium text-primary">{phase.scriptureReference}</p>
            <p className="mt-1 italic">&ldquo;{phase.scriptureTextNLT}&rdquo;</p>
          </OverviewBlock>

          <OverviewBlock icon="calendar_month" title="Schedule">
            <p>{phase.scheduleSummary}</p>
          </OverviewBlock>

          {(phase.allowed?.length ?? 0) > 0 && (
            <OverviewBlock icon="restaurant" title="Daily Eating">
              <ul className="space-y-1">
                {phase.allowed!.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Icon name="check_circle" size={16} className="mt-0.5 shrink-0 text-secondary" />
                    {item}
                  </li>
                ))}
              </ul>
              {(phase.avoid?.length ?? 0) > 0 && (
                <div className="mt-3">
                  <p className="mb-1 font-medium text-primary">Avoid</p>
                  <ul className="space-y-1">
                    {phase.avoid!.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Icon name="block" size={16} className="mt-0.5 shrink-0 text-error" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </OverviewBlock>
          )}

          {(phase.dailyReadings?.length ?? 0) > 0 && (
            <OverviewBlock icon="auto_stories" title="Daily Readings">
              <p>{phase.dailyReadings!.join(' · ')}</p>
            </OverviewBlock>
          )}

          {(phase.prayerFocus?.length ?? 0) > 0 && (
            <OverviewBlock icon="flare" title="Prayer Focus">
              <ul className="space-y-2">
                {phase.prayerFocus.map((focus) => (
                  <li key={focus} className="flex items-start gap-2">
                    <Icon name="favorite" size={16} className="mt-0.5 shrink-0 text-secondary" />
                    {focus}
                  </li>
                ))}
              </ul>
            </OverviewBlock>
          )}

          <div className="relative">
            <img
              src={phase.imagePath}
              alt={`${phase.title} phase overview`}
              className="w-full rounded-xl grace-shadow"
            />
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              aria-label="Zoom phase overview image"
            >
              <Icon name="zoom_in" size={20} />
            </button>
          </div>
      </div>

      {lightboxOpen && phase.imagePath && (
        <ImageLightbox
          src={phase.imagePath}
          alt={`${phase.title} phase illustration`}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
