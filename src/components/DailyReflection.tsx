import confetti from 'canvas-confetti';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { trackEvent } from '../lib/analytics';
import { getCelebrationMessage } from '../data/encouragements';
import { evaluateBadges } from '../lib/badges';
import { useActiveJourney } from '../hooks/useActiveJourney';
import { useGroupCommitmentContexts } from '../hooks/useGroupCommitmentContexts';
import {
  DAILY_REFLECTION_FIELDS_AFTER_MOOD,
  DAILY_REFLECTION_FIELDS_BEFORE_MOOD,
  joinTrimmedValues,
} from '../lib/journalTags';
import { formatError, messages } from '../lib/messages';
import {
  createJournalEntryId,
  getCheckIn,
  getDailyReflectionByDate,
  getProgress,
  saveDailyReflectionWithCheckIn,
} from '../lib/storage';
import { getCurrentStreak } from '../lib/streaks';
import { toast } from '../lib/toast';
import type {
  Badge,
  CheckIn,
  DailyReflectionEntry,
  DayMood,
} from '../types';
import { BadgeSprite } from './BadgeSprite';
import { GroupCommitmentRows } from './GroupCommitmentRows';
import { Icon } from './Icon';
import { InfoBanner } from './InfoBanner';
import { LoadingButton } from './LoadingButton';
import { MoodPicker } from './MoodPicker';
import { DailyReflectionMeditation } from './VerseOfTheDay';
import { CheckRow, GuidedReflectionFlow } from './home/GuidedReflectionFlow';
import {
  CHECK_IN_COMMITMENTS,
  TODAY_COMMITMENTS_HEADING,
  TODAY_COMMITMENTS_SUBTITLE,
} from '../lib/checkInCommitments';

type Props = {
  date: string;
  /** Full-height layout when embedded in the guided journey full-screen flow. */
  layout?: 'default' | 'guided';
  /** Prayer focus points shown before check-in in the guided journey flow. */
  prayerPoints?: string[];
};

function badgesEarnedOnDate(date: string): Badge[] {
  return getProgress().badges.filter(
    (badge) => Boolean(badge.earnedAt) && badge.earnedAt!.startsWith(date),
  );
}

function MorningReflectionComplete({
  message,
  streak,
  badges,
}: {
  message: string;
  streak: number;
  badges: Badge[];
}) {
  return (
    <div
      className="stitch-card space-y-stack-md p-stack-md text-center"
      data-testid="morning-reflection-complete"
    >
      <Icon name="celebration" className="mx-auto text-4xl text-secondary" />
      <p className="font-display text-headline-md text-primary">{message}</p>
      <p className="text-body-md text-on-surface-variant">
        {streak === 1 ? (
          <>Day 1 of your check-in streak.</>
        ) : (
          <>
            <strong className="text-primary">{streak}</strong> consecutive check-in days.
          </>
        )}
      </p>
      {badges.length > 0 && (
        <div className="space-y-stack-sm">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {badges.map((badge) => (
              <BadgeSprite
                key={badge.id}
                id={badge.id}
                earned
                size={72}
                title={badge.title}
              />
            ))}
          </div>
          <p className="text-body-md text-on-surface-variant">
            {badges.length === 1 ? (
              <>
                You earned <strong className="text-primary">{badges[0].title}</strong>.
              </>
            ) : (
              <>You earned {badges.length} sacred milestones today.</>
            )}
          </p>
        </div>
      )}
      <p className="text-body-sm text-on-surface-variant">
        You&apos;re checked in for today. Come back tomorrow for a new reflection.
      </p>
      <Link
        to="/journal"
        className="btn-stitch-secondary inline-flex w-full items-center justify-center"
      >
        View in Journal
      </Link>
    </div>
  );
}

export function DailyReflection({ date, layout = 'default', prayerPoints = [] }: Props) {
  const { getPhaseForDate } = useActiveJourney();
  const phase = getPhaseForDate(date);
  const existingEntry = getDailyReflectionByDate(date);
  const existingCheckIn = getCheckIn(date);
  const isCompleteForDay = Boolean(existingEntry && existingCheckIn);

  const [followedPlan, setFollowedPlan] = useState(existingCheckIn?.followedPlan ?? false);
  const [prayedFocus, setPrayedFocus] = useState(existingCheckIn?.prayedFocus ?? false);
  const [readScripture, setReadScripture] = useState(existingCheckIn?.readScripture ?? false);
  const [walkWithGod, setWalkWithGod] = useState(existingCheckIn?.walkWithGod ?? false);
  const [dayMood, setDayMood] = useState<DayMood | null>(existingEntry?.dayMood ?? null);
  const [prayedAbout, setPrayedAbout] = useState(existingEntry?.prayedAbout ?? '');
  const [godTeaching, setGodTeaching] = useState(existingEntry?.godTeaching ?? '');
  const [hungerNotes, setHungerNotes] = useState(existingEntry?.hungerNotes ?? '');
  const [victory, setVictory] = useState(
    existingEntry?.victory ?? existingCheckIn?.win ?? '',
  );
  const [tomorrowIntention, setTomorrowIntention] = useState(existingEntry?.tomorrowIntention ?? '');
  const [saving, setSaving] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [freshBadges, setFreshBadges] = useState<Badge[]>([]);
  const { groupContexts, groupResults, setGroupResults } = useGroupCommitmentContexts(date);

  const currentStreak = getCurrentStreak(date);
  const reflectionFields = [prayedAbout, godTeaching, hungerNotes, victory, tomorrowIntention];
  const hasReflectionContent = joinTrimmedValues(reflectionFields).length > 0;

  const dailyFieldState = {
    prayedAbout: [prayedAbout, setPrayedAbout] as const,
    godTeaching: [godTeaching, setGodTeaching] as const,
    hungerNotes: [hungerNotes, setHungerNotes] as const,
    victory: [victory, setVictory] as const,
    tomorrowIntention: [tomorrowIntention, setTomorrowIntention] as const,
  };

  const inputClass =
    'w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md grace-shadow focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!dayMood) {
      toast.error(messages.errors.journalMoodRequired);
      return;
    }

    if (!hasReflectionContent) {
      toast.error(messages.errors.journalContentRequired);
      return;
    }

    setSaving(true);

    const entry: DailyReflectionEntry = {
      id: existingEntry?.id ?? createJournalEntryId(),
      date,
      updatedAt: new Date().toISOString(),
      type: 'daily-reflection',
      dayMood,
      prayerFocus: existingEntry?.prayerFocus?.trim() ?? '',
      prayedAbout: prayedAbout.trim(),
      godTeaching: godTeaching.trim(),
      hungerNotes: hungerNotes.trim(),
      victory: victory.trim(),
      tomorrowIntention: tomorrowIntention.trim(),
    };

    const checkIn: CheckIn = {
      date,
      followedPlan,
      prayedFocus,
      readScripture,
      walkWithGod,
      journaled: true,
      win: victory.trim(),
      completedAt: new Date().toISOString(),
    };

    try {
      const groupCheckIns = groupContexts.flatMap((ctx) => {
        const results = groupResults[ctx.group.id] ?? [];
        if (results.length === 0 && !ctx.hasExistingCheckIn) return [];

        return [{
          groupId: ctx.group.id,
          checkIn: {
            date,
            results,
            completedAt: new Date().toISOString(),
          },
        }];
      });

      saveDailyReflectionWithCheckIn(entry, checkIn, groupCheckIns);
    } catch (err) {
      toast.error(formatError(err, messages.errors.saveJournal));
      setSaving(false);
      return;
    }

    trackEvent('journal_entry_saved', {
      entry_type: 'daily-reflection',
      is_update: Boolean(existingEntry),
    });
    trackEvent('check_in_completed', {
      phase_id: phase?.id ?? 'unknown',
      streak: getCurrentStreak(date),
    });

    const earned = evaluateBadges(date);
    setFreshBadges(earned);
    setJustCompleted(true);
    setSaving(false);

    confetti({
      particleCount: earned.length > 0 ? 120 : 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#d2eabf', '#173d00', '#fed65b', '#f9faf0'],
    });

    if (earned.length > 0) {
      setTimeout(() => {
        confetti({
          particleCount: 40,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#fed65b', '#173d00', '#d2eabf'],
        });
      }, 400);
    }
  };

  if (isCompleteForDay || justCompleted) {
    const badges = justCompleted
      ? (freshBadges.length > 0 ? freshBadges : badgesEarnedOnDate(date))
      : badgesEarnedOnDate(date);

    return (
      <MorningReflectionComplete
        message={getCelebrationMessage(date)}
        streak={getCurrentStreak(date)}
        badges={badges}
      />
    );
  }

  if (layout === 'guided') {
    return (
      <GuidedReflectionFlow
        date={date}
        prayerPoints={prayerPoints}
        phase={phase}
        currentStreak={currentStreak}
        followedPlan={followedPlan}
        setFollowedPlan={setFollowedPlan}
        prayedFocus={prayedFocus}
        setPrayedFocus={setPrayedFocus}
        readScripture={readScripture}
        setReadScripture={setReadScripture}
        walkWithGod={walkWithGod}
        setWalkWithGod={setWalkWithGod}
        dayMood={dayMood}
        setDayMood={setDayMood}
        fieldValues={{
          godTeaching,
          prayedAbout,
          hungerNotes,
          victory,
          tomorrowIntention,
        }}
        onFieldChange={(key, value) => {
          const setters = {
            godTeaching: setGodTeaching,
            prayedAbout: setPrayedAbout,
            hungerNotes: setHungerNotes,
            victory: setVictory,
            tomorrowIntention: setTomorrowIntention,
          } as const;
          setters[key](value);
        }}
        groupContexts={groupContexts}
        groupResults={groupResults}
        setGroupResults={setGroupResults}
        saving={saving}
        onSubmit={handleSubmit}
      />
    );
  }

  const fieldRows = 3;

  return (
    <form
      onSubmit={handleSubmit}
      className="stitch-card flex max-h-[min(70vh,42rem)] min-h-0 flex-col overflow-hidden"
      noValidate
    >
      <div className="min-h-0 flex-1 space-y-stack-md overflow-y-auto overscroll-contain p-stack-md">
      <section aria-labelledby="daily-reflection-checkin-heading">
        <h4
          id="daily-reflection-checkin-heading"
          className="mb-stack-sm font-display text-headline-sm text-primary"
        >
          {TODAY_COMMITMENTS_HEADING}
        </h4>
        <p className="mb-stack-sm text-body-md text-on-surface-variant">
          {TODAY_COMMITMENTS_SUBTITLE}
        </p>

        {phase && (
          <InfoBanner variant="phase" icon="flag" className="mb-stack-sm px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-body-md">
            Phase {phase.id}: {phase.title}
          </InfoBanner>
        )}

        <div className="mb-stack-sm rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-center sm:px-4 sm:py-3">
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

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CHECK_IN_COMMITMENTS.map(({ key, label }) => (
            <CheckRow
              key={key}
              label={label}
              checked={
                key === 'followedPlan'
                  ? followedPlan
                  : key === 'prayedFocus'
                    ? prayedFocus
                    : key === 'readScripture'
                      ? readScripture
                      : walkWithGod
              }
              onChange={
                key === 'followedPlan'
                  ? setFollowedPlan
                  : key === 'prayedFocus'
                    ? setPrayedFocus
                    : key === 'readScripture'
                      ? setReadScripture
                      : setWalkWithGod
              }
            />
          ))}
        </div>

        {groupContexts.length > 0 && (
          <div className="mt-stack-md space-y-4">
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
      </section>

      <section aria-labelledby="daily-reflection-fields-heading" className="space-y-stack-md">
        <h4
          id="daily-reflection-fields-heading"
          className="font-display text-headline-sm text-primary"
        >
          Reflection
        </h4>

        <DailyReflectionMeditation
          entry={{
            id: existingEntry?.id ?? '',
            date,
            type: 'daily-reflection',
            dayMood: existingEntry?.dayMood ?? null,
            prayerFocus: existingEntry?.prayerFocus ?? '',
            prayedAbout: existingEntry?.prayedAbout ?? '',
            godTeaching: existingEntry?.godTeaching ?? '',
            hungerNotes: existingEntry?.hungerNotes ?? '',
            victory: existingEntry?.victory ?? '',
            tomorrowIntention: existingEntry?.tomorrowIntention ?? '',
            updatedAt: existingEntry?.updatedAt ?? '',
          }}
          variant="journal"
        />

        {DAILY_REFLECTION_FIELDS_BEFORE_MOOD.map(({ key, label }) => (
          <label key={key} className="block">
            <span className="mb-1 block text-body-md font-medium text-on-surface">
              {label}
            </span>
            <textarea
              value={dailyFieldState[key][0]}
              onChange={(e) => dailyFieldState[key][1](e.target.value)}
              placeholder={`${label}…`}
              aria-label={label}
              rows={fieldRows}
              className={inputClass}
            />
          </label>
        ))}

        <MoodPicker value={dayMood} onChange={setDayMood} />

        {DAILY_REFLECTION_FIELDS_AFTER_MOOD.map(({ key, label }) => (
          <label key={key} className="block">
            <span className="mb-1 block text-body-md font-medium text-on-surface">
              {label}
            </span>
            <textarea
              value={dailyFieldState[key][0]}
              onChange={(e) => dailyFieldState[key][1](e.target.value)}
              placeholder={`${label}…`}
              aria-label={label}
              rows={fieldRows}
              className={inputClass}
            />
          </label>
        ))}
      </section>
      </div>

      <div className="shrink-0 border-t border-outline-variant/30 bg-linen p-stack-md pt-2">
      <LoadingButton
        type="submit"
        loading={saving}
        loadingLabel="Saving…"
        className="w-full"
      >
        Save Reflection & Check-In
      </LoadingButton>
      </div>
    </form>
  );
}
