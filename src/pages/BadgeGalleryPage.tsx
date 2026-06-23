import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeSprite } from '../components/BadgeSprite';
import { Icon } from '../components/Icon';
import { GLOBAL_BADGES, getPhaseMilestonesForPhase } from '../data/phaseAchievements';
import type { PhaseMilestoneDef } from '../data/phaseAchievements';
import { FAST_PHASES } from '../data/fastingPlan';

// ─── Tier metadata ────────────────────────────────────────────────────────────
type Tier = 1 | 2 | 3 | 'complete';

function getTierFromId(id: string): Tier {
  if (id.endsWith('-complete') || id === 'finished-plan') return 'complete';
  if (id.includes('-21') || id === 'streak-21') return 3;
  if (id.includes('-14') || id === 'streak-14') return 2;
  return 1;
}

const BADGE_SIZE = 80;

const TIER_META: Record<
  Tier,
  { label: string; ring: string; textColor: string; bgColor: string }
> = {
  1:        { label: 'Tier I',    ring: '#c2c9b8', textColor: '#42493c', bgColor: '#edefe5' },
  2:        { label: 'Tier II',   ring: '#b0b8c0', textColor: '#2e3e58', bgColor: '#dce4ec' },
  3:        { label: 'Tier III',  ring: '#c8a200', textColor: '#4f3e00', bgColor: '#fdf0c0' },
  complete: { label: 'Complete',  ring: '#a07800', textColor: '#3a2800', bgColor: '#fed65b' },
};

function TierPip({ tier }: { tier: Tier }) {
  const m = TIER_META[tier];
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
      style={{ backgroundColor: m.bgColor, color: m.textColor, border: `1px solid ${m.ring}` }}
    >
      {m.label}
    </span>
  );
}

// ─── Single tile ──────────────────────────────────────────────────────────────
type TileData = {
  id: string;
  title: string;
  description: string;
  threshold: number | 'complete' | null;
  tier: Tier;
};

function ProgressTile({
  tile,
  showLocked,
}: {
  tile: TileData;
  showLocked: boolean;
}) {
  return (
    <figure className="flex flex-col items-center gap-1.5 text-center">
      {/* Tier pill */}
      <TierPip tier={tile.tier} />

      {/* Badge */}
      <div
        className={`rounded-full transition-transform hover:scale-105 ${
          showLocked ? '' : 'grace-shadow'
        }`}
      >
        <BadgeSprite
          id={tile.id}
          earned={!showLocked}
          size={BADGE_SIZE}
          title={tile.title}
        />
      </div>

      {/* Label */}
      <figcaption className="space-y-0.5" style={{ maxWidth: BADGE_SIZE + 8 }}>
        <p className="text-center text-body-md font-semibold leading-tight text-primary">
          {tile.title}
        </p>

        {/* Threshold */}
        {tile.threshold !== null && (
          <span className="label-caps text-on-surface-variant">
            {tile.threshold === 'complete'
              ? 'Phase complete'
              : `${tile.threshold} day${tile.threshold !== 1 ? 's' : ''}`}
          </span>
        )}

        {/* Badge ID (dev reference) */}
        <p className="font-mono text-[9px] leading-tight text-on-surface-variant/40">
          {tile.id}
        </p>
      </figcaption>
    </figure>
  );
}

// ─── Phase progression row ────────────────────────────────────────────────────
function PhaseProgressionTrack({
  phaseId,
  title,
  scriptureRef,
  themeColor,
  milestones,
  showLocked,
}: {
  phaseId: number;
  title: string;
  scriptureRef: string;
  themeColor: string;
  milestones: PhaseMilestoneDef[];
  showLocked: boolean;
}) {
  const tiles: TileData[] = milestones.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    threshold: m.threshold,
    tier: getTierFromId(m.id),
  }));

  return (
    <section className="stitch-card">
      {/* Phase color bar */}
      <div className="flex items-stretch">
        <div className="w-1.5 shrink-0" style={{ backgroundColor: themeColor }} aria-hidden />
        <div className="min-w-0 flex-1 p-stack-md space-y-stack-md">
          {/* Header */}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="font-display text-headline-md text-primary">
                Phase {phaseId} — {title}
              </h3>
              <p className="mt-0.5 text-body-md italic text-on-surface-variant">{scriptureRef}</p>
            </div>
            <span className="label-caps text-secondary">{tiles.length} milestones</span>
          </div>

          {/* Badge track — scrolls horizontally so all tiles fit at full size */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 pb-1 pt-1">
              {tiles.map((tile) => (
                <div key={tile.id} className="w-24 shrink-0">
                  <ProgressTile tile={tile} showLocked={showLocked} />
                </div>
              ))}
            </div>
          </div>

          {/* Journey label under the track */}
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: `${themeColor}18` }}
          >
            <div className="h-px flex-1" style={{ backgroundColor: themeColor, opacity: 0.3 }} />
            <span className="label-caps shrink-0" style={{ color: themeColor }}>
              journey ↑
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: themeColor, opacity: 0.3 }} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Global streak progression ────────────────────────────────────────────────
function StreakTrack({ showLocked }: { showLocked: boolean }) {
  const streaks = GLOBAL_BADGES.filter((b) => b.kind === 'streak');
  const tiles: TileData[] = streaks.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    threshold: b.threshold,
    tier: getTierFromId(b.id),
  }));

  return (
    <div className="space-y-stack-sm">
      <p className="label-caps text-on-surface-variant">Streak progression</p>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 pb-1 pt-1">
          {tiles.map((tile) => (
            <div key={tile.id} className="w-24 shrink-0">
              <ProgressTile tile={tile} showLocked={showLocked} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const GLOBAL_ACCENT_COLOR = '#506442';

// ─── One-off global badges grid ────────────────────────────────────────────────
function OneOffBadges({ showLocked }: { showLocked: boolean }) {
  const oneoffs = GLOBAL_BADGES.filter((b) => b.kind !== 'streak');
  const tiles: TileData[] = oneoffs.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    threshold: b.threshold,
    tier: getTierFromId(b.id),
  }));

  return (
    <div className="space-y-stack-sm">
      <p className="label-caps text-on-surface-variant">Journey badges</p>
      <div className="grid grid-cols-2 gap-x-gutter gap-y-stack-lg sm:grid-cols-4">
        {tiles.map((tile) => (
          <figure key={tile.id} className="group flex flex-col items-center text-center">
            <div className={`rounded-full transition-transform group-hover:scale-105 ${showLocked ? '' : 'grace-shadow'}`}>
              <BadgeSprite id={tile.id} earned={!showLocked} size={BADGE_SIZE} title={tile.title} />
            </div>
            <figcaption className="mt-2 space-y-1">
              <p className="text-body-md font-semibold leading-tight text-primary">{tile.title}</p>
              <TierPip tier={tile.tier} />
              <p className="font-mono text-[9px] text-on-surface-variant/40">{tile.id}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

// ─── Tier legend ──────────────────────────────────────────────────────────────
const TIER_LEGEND_ENTRIES: Array<{
  tier: Tier;
  frame: string;
  desc: string;
}> = [
  {
    tier: 1,
    frame: 'Single accent ring · 32 tick marks',
    desc: 'Early milestone — clean and simple',
  },
  {
    tier: 2,
    frame: 'Double ring · dashed gold outer · 4 diamond accents',
    desc: 'Mid-phase achievement — starting to ornament',
  },
  {
    tier: 3,
    frame: 'Triple ring · gold border · 8 laurel leaves',
    desc: 'Late-phase mastery — gold laurel treatment',
  },
  {
    tier: 'complete',
    frame: 'Full laurel wreath · crown at top · double gold ring',
    desc: 'Phase complete — most prestigious frame',
  },
];

function TierLegend() {
  return (
    <section className="stitch-card p-stack-md space-y-stack-md">
      <h2 className="font-display text-headline-md text-primary">Frame Progression</h2>
      <p className="text-body-md text-on-surface-variant">
        All badges are the same size. Tier is expressed through the medallion frame — more ornament, more rings, more gold.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TIER_LEGEND_ENTRIES.map(({ tier, frame, desc }) => {
          const meta = TIER_META[tier];
          return (
            <div
              key={tier}
              className="flex items-start gap-3 rounded-xl p-3"
              style={{ backgroundColor: meta.bgColor + '50', border: `1px solid ${meta.ring}60` }}
            >
              <div className="shrink-0 pt-0.5">
                <TierPip tier={tier} />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-body-md font-semibold leading-tight text-primary">{desc}</p>
                <p className="text-[11px] leading-snug text-on-surface-variant">{frame}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function BadgeGalleryPage() {
  const [showLocked, setShowLocked] = useState(false);

  const totalCount =
    GLOBAL_BADGES.length +
    FAST_PHASES.reduce((sum, p) => sum + getPhaseMilestonesForPhase(p.id).length, 0);

  return (
    <div className="space-y-stack-lg animate-fade-in-up pb-stack-lg">
      <Link
        to="/progress"
        className="inline-flex items-center gap-1 text-body-md font-medium text-primary transition-opacity hover:opacity-80"
      >
        <Icon name="arrow_back" size={20} />
        Your Sacred Journey
      </Link>

      {/* Hero header */}
      <header className="stitch-card overflow-hidden">
        <div className="bg-gradient-to-br from-secondary-container via-surface to-linen px-stack-md py-stack-lg text-center">
          <Icon name="military_tech" className="mx-auto text-secondary" size={36} filled />
          <h1 className="mt-stack-sm font-display text-headline-lg-mobile text-primary">
            Sacred Milestones
          </h1>
          <p className="mx-auto mt-2 max-w-md text-body-md text-on-surface-variant">
            {totalCount} medallions — every badge earnable across the 8-phase fasting journey.
          </p>
        </div>
      </header>

      {/* Toggle */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low px-stack-md py-3">
        <div>
          <p className="text-body-md font-medium text-primary">Preview state</p>
          <p className="label-caps text-on-surface-variant">
            {showLocked ? 'Locked — grayscale / 35% opacity' : 'Earned — full color'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowLocked((v) => !v)}
          className={`rounded-lg px-4 py-2 text-body-md font-semibold transition-all active:scale-95 ${
            showLocked
              ? 'bg-surface-container-high text-on-surface-variant'
              : 'bg-secondary-container text-on-secondary-container'
          }`}
        >
          {showLocked ? 'Show earned' : 'Show locked'}
        </button>
      </div>

      {/* Tier legend */}
      <TierLegend />

      {/* Global journey badges */}
      <section className="stitch-card space-y-stack-lg p-stack-md">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-headline-md text-primary">Journey Badges</h3>
          <span className="label-caps text-secondary">{GLOBAL_BADGES.length} badges</span>
        </div>
        <StreakTrack showLocked={showLocked} />
        <div className="h-px bg-outline-variant/20" />
        <OneOffBadges showLocked={showLocked} />
      </section>

      {/* Phase progression tracks */}
      {FAST_PHASES.map((phase) => (
        <PhaseProgressionTrack
          key={phase.id}
          phaseId={phase.id}
          title={phase.title}
          scriptureRef={phase.scriptureReference}
          themeColor={phase.themeColor}
          milestones={getPhaseMilestonesForPhase(phase.id)}
          showLocked={showLocked}
        />
      ))}

      <footer className="rounded-xl border border-dashed border-outline-variant/50 bg-surface-container-low/60 px-stack-md py-stack-md text-center space-y-1">
        <p className="label-caps text-on-surface-variant">
          Assets — <code className="text-primary">public/assets/badges/</code>
        </p>
        <p className="text-body-md text-on-surface-variant">
          Regenerate: <code className="text-primary">node scripts/generate-badge-sprites.mjs</code>
        </p>
      </footer>
    </div>
  );
}
