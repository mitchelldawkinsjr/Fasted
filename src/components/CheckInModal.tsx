import confetti from 'canvas-confetti';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useActiveJourney } from '../hooks/useActiveJourney';
import { getCelebrationMessage } from '../data/encouragements';
import { evaluateBadges } from '../lib/badges';
import { getGroupCommitments, getMyCovenant, listMyGroups } from '../lib/groups';
import { formatError, messages } from '../lib/messages';
import { getGroupCheckIn, getJournalEntryByDate, saveCheckInWithGroupCheckIns } from '../lib/storage';
import { getCurrentStreak } from '../lib/streaks';
import { toast } from '../lib/toast';
import type { Badge, CheckIn, CommitmentDefinition, CommitmentResult, GroupRecord } from '../types';
import { BadgeSprite } from './BadgeSprite';
import { GroupCommitmentRows } from './GroupCommitmentRows';
import { Icon } from './Icon';
import { InfoBanner } from './InfoBanner';
import { LoadingButton } from './LoadingButton';

type Props = {
  date: string;
  existing?: CheckIn;
  onClose: () => void;
  onComplete: (badges: Badge[]) => void;
};

type GroupCommitmentContext = {
  group: GroupRecord;
  commitments: CommitmentDefinition[];
  existingResults?: CommitmentResult[];
  hasExistingCheckIn: boolean;
};

const PLAIN_CELEBRATION_MS = 3200;
const CONTINUE_READY_MS = 1200;

export function CheckInModal({ date, existing, onClose, onComplete }: Props) {
  const [followedPlan, setFollowedPlan] = useState(existing?.followedPlan ?? false);
  const [prayedFocus, setPrayedFocus] = useState(existing?.prayedFocus ?? false);
  const [readScripture, setReadScripture] = useState(existing?.readScripture ?? false);
  const [journaled, setJournaled] = useState(existing?.journaled ?? false);
  const [celebrating, setCelebrating] = useState(false);
  const [continueReady, setContinueReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [savedStreak, setSavedStreak] = useState<number | null>(null);

  const { getPhaseForDate } = useActiveJourney();
  const phase = getPhaseForDate(date);
  const currentStreak = getCurrentStreak(date);
  const [groupContexts, setGroupContexts] = useState<GroupCommitmentContext[]>([]);
  const [groupResults, setGroupResults] = useState<Record<string, CommitmentResult[]>>({});
  const onCompleteRef = useRef(onComplete);
  const onCloseRef = useRef(onClose);

  onCompleteRef.current = onComplete;
  onCloseRef.current = onClose;

  const dismissCelebration = () => {
    onCompleteRef.current(earnedBadges);
    onCloseRef.current();
  };

  useEffect(() => {
    if (getJournalEntryByDate(date)) {
      setJournaled(true);
    }
  }, [date]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const myGroups = await listMyGroups();
        const contexts: GroupCommitmentContext[] = [];

        for (const group of myGroups) {
          const covenant = await getMyCovenant(group.id);
          if (!covenant) continue;

          const commitments = await getGroupCommitments(group.id);
          if (commitments.length === 0) continue;

          const existingGroupCheckIn = getGroupCheckIn(group.id, date);
          contexts.push({
            group,
            commitments,
            existingResults: existingGroupCheckIn?.results,
            hasExistingCheckIn: !!existingGroupCheckIn,
          });
        }

        if (!cancelled) setGroupContexts(contexts);
      } catch {
        if (!cancelled) setGroupContexts([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date]);

  useEffect(() => {
    const initial: Record<string, CommitmentResult[]> = {};
    for (const ctx of groupContexts) {
      initial[ctx.group.id] = ctx.existingResults ?? [];
    }
    setGroupResults(initial);
  }, [groupContexts]);

  useEffect(() => {
    if (!celebrating) {
      setContinueReady(false);
      return;
    }

    if (earnedBadges.length === 0) {
      const timer = window.setTimeout(dismissCelebration, PLAIN_CELEBRATION_MS);
      return () => window.clearTimeout(timer);
    }

    setContinueReady(false);
    const readyTimer = window.setTimeout(() => setContinueReady(true), CONTINUE_READY_MS);

    return () => {
      window.clearTimeout(readyTimer);
    };
  }, [celebrating, earnedBadges.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const checkIn: CheckIn = {
      date,
      followedPlan,
      prayedFocus,
      readScripture,
      journaled: journaled || Boolean(getJournalEntryByDate(date)),
      win: existing?.win ?? '',
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

      saveCheckInWithGroupCheckIns(checkIn, groupCheckIns);
    } catch (err) {
      toast.error(formatError(err, messages.errors.saveCheckIn));
      setSaving(false);
      return;
    }

    const nextStreak = getCurrentStreak(date);
    setSavedStreak(nextStreak);

    const earned = evaluateBadges(date);
    setEarnedBadges(earned);
    setMessage(getCelebrationMessage(date));
    setCelebrating(true);
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

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={celebrating ? 'checkin-celebration-title' : 'checkin-title'}
    >
      <div className="flex max-h-[90vh] w-full max-w-md animate-fade-in-up flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-grace">
        {celebrating ? (
          <>
            <div className="animate-gentle-pulse p-3 py-6 text-center sm:p-stack-lg">
              <Icon name="celebration" className="mb-2 text-4xl text-secondary" />
              <p id="checkin-celebration-title" className="font-display text-headline-md text-primary">
                {message}
              </p>
              {savedStreak !== null && (
                <p className="mt-stack-sm text-body-md text-on-surface-variant">
                  {savedStreak === 1 ? (
                    <>Day 1 of your check-in streak.</>
                  ) : (
                    <>
                      <strong className="text-primary">{savedStreak}</strong> consecutive check-in days.
                    </>
                  )}
                </p>
              )}
              {earnedBadges.length > 0 && (
                <div className="mt-stack-md space-y-stack-sm">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {earnedBadges.map((badge) => (
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
                    {earnedBadges.length === 1 ? (
                      <>
                        You earned <strong className="text-primary">{earnedBadges[0].title}</strong>.
                      </>
                    ) : (
                      <>
                        You earned {earnedBadges.length} new sacred milestones.
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
            {earnedBadges.length > 0 && (
              <div
                className={`shrink-0 border-t border-surface-variant p-3 pt-4 transition-opacity duration-500 sm:p-stack-lg ${
                  continueReady ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <LoadingButton
                  type="button"
                  onClick={dismissCelebration}
                  disabled={!continueReady}
                  className="w-full"
                >
                  Continue
                </LoadingButton>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-stack-lg">
              <h2 id="checkin-title" className="mb-2 font-display text-xl text-primary sm:mb-stack-md sm:text-headline-md">
                Complete Today&apos;s Check-In
              </h2>

              {phase && (
                <InfoBanner variant="phase" icon="flag" className="mb-2 px-2 py-1 text-xs sm:mb-stack-md sm:px-3 sm:py-2 sm:text-body-md">
                  Phase {phase.id}: {phase.title}
                </InfoBanner>
              )}

              <div className="mb-2 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-center sm:mb-stack-md sm:px-4 sm:py-3">
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

              <div className="grid grid-cols-2 gap-2 sm:block sm:space-y-3">
                <CheckRow label="Did you follow today's fasting plan?" checked={followedPlan} onChange={setFollowedPlan} />
                <CheckRow label="Did you pray over today's focus?" checked={prayedFocus} onChange={setPrayedFocus} />
                <CheckRow label="Did you read today's scripture?" checked={readScripture} onChange={setReadScripture} />
                <CheckRow label="Did you journal today?" checked={journaled} onChange={setJournaled} />
              </div>

              {groupContexts.length > 0 && (
                <div className="mt-2 space-y-4 sm:mt-stack-md">
                  {groupContexts.map((ctx) => (
                    <section key={ctx.group.id}>
                      <h3 className="mb-2 label-caps text-secondary">
                        Group commitments · {ctx.group.name}
                      </h3>
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

            <div className="flex shrink-0 gap-2 border-t border-surface-variant p-3 pt-4 sm:gap-3 sm:p-stack-lg">
              <LoadingButton type="button" onClick={onClose} variant="secondary" className="flex-1">
                Cancel
              </LoadingButton>
              <LoadingButton
                type="submit"
                loading={saving}
                loadingLabel="Saving…"
                className="flex-1"
              >
                Save Check-In
              </LoadingButton>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-low p-2 transition-colors hover:bg-surface-container-high sm:items-center sm:gap-3 sm:p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded accent-primary sm:mt-0"
      />
      <span className="text-xs leading-snug text-on-surface sm:text-body-md">{label}</span>
    </label>
  );
}
