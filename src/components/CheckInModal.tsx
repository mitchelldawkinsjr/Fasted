import confetti from 'canvas-confetti';
import { useEffect, useState } from 'react';
import { useActiveJourney } from '../hooks/useActiveJourney';
import { getCelebrationMessage } from '../data/encouragements';
import { evaluateBadges } from '../lib/badges';
import { getGroupCommitments, getMyCovenant, listMyGroups } from '../lib/groups';
import { formatError, messages } from '../lib/messages';
import { getGroupCheckIn, getJournalEntryByDate, saveCheckIn, saveGroupCheckIn } from '../lib/storage';
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
};

export function CheckInModal({ date, existing, onClose, onComplete }: Props) {
  const [followedPlan, setFollowedPlan] = useState(existing?.followedPlan ?? false);
  const [prayedFocus, setPrayedFocus] = useState(existing?.prayedFocus ?? false);
  const [readScripture, setReadScripture] = useState(existing?.readScripture ?? false);
  const [journaled, setJournaled] = useState(existing?.journaled ?? false);
  const [win, setWin] = useState(existing?.win ?? '');
  const [celebrating, setCelebrating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [savedStreak, setSavedStreak] = useState<number | null>(null);

  const { getPhaseForDate } = useActiveJourney();
  const phase = getPhaseForDate(date);
  const currentStreak = getCurrentStreak(date);
  const [groupContexts, setGroupContexts] = useState<GroupCommitmentContext[]>([]);
  const [groupResults, setGroupResults] = useState<Record<string, CommitmentResult[]>>({});

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const checkIn: CheckIn = {
      date,
      followedPlan,
      prayedFocus,
      readScripture,
      journaled: journaled || Boolean(getJournalEntryByDate(date)),
      win: win.trim(),
      completedAt: new Date().toISOString(),
    };

    try {
      saveCheckIn(checkIn);

      for (const ctx of groupContexts) {
        const results = groupResults[ctx.group.id] ?? [];
        saveGroupCheckIn(ctx.group.id, {
          date,
          results,
          completedAt: new Date().toISOString(),
        });
      }
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

    setTimeout(() => {
      onComplete(earned);
      onClose();
    }, earned.length > 0 ? 2800 : 1800);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-md animate-fade-in-up flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-grace">
        {celebrating ? (
          <div className="animate-gentle-pulse p-stack-lg py-6 text-center">
            <Icon name="celebration" className="mb-2 text-4xl text-secondary" />
            <p className="font-display text-headline-md text-primary">{message}</p>
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
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-stack-lg">
              <h2 id="checkin-title" className="mb-stack-md font-display text-headline-md text-primary">
                Complete Today&apos;s Check-In
              </h2>

              {phase && (
                <InfoBanner variant="phase" icon="flag" className="mb-stack-md">
                  Phase {phase.id}: {phase.title}
                </InfoBanner>
              )}

              <div className="mb-stack-md rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-center">
                <span className="label-caps text-on-surface-variant">Check-in streak</span>
                <p className="mt-1 font-display text-headline-md text-primary">
                  {currentStreak}{' '}
                  <span className="text-body-md font-normal text-on-surface-variant">
                    consecutive {currentStreak === 1 ? 'day' : 'days'}
                  </span>
                </p>
              </div>

              <div className="space-y-3">
                <CheckRow label="Did you follow today's fasting plan?" checked={followedPlan} onChange={setFollowedPlan} />
                <CheckRow label="Did you pray over today's focus?" checked={prayedFocus} onChange={setPrayedFocus} />
                <CheckRow label="Did you read today's scripture?" checked={readScripture} onChange={setReadScripture} />
                <CheckRow label="Did you journal today?" checked={journaled} onChange={setJournaled} />

                <label className="block">
                  <span className="mb-1 block text-body-md font-medium text-on-surface">
                    What is one win from today?
                  </span>
                  <textarea
                    value={win}
                    onChange={(e) => setWin(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                    placeholder="Even a small victory counts..."
                  />
                </label>
              </div>

              {groupContexts.length > 0 && (
                <div className="mt-stack-md space-y-4">
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

            <div className="flex shrink-0 gap-3 border-t border-surface-variant p-stack-lg pt-4">
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
    </div>
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
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 transition-colors hover:bg-surface-container-high">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded accent-primary"
      />
      <span className="text-body-md text-on-surface">{label}</span>
    </label>
  );
}
