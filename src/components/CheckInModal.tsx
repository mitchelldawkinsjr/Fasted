import confetti from 'canvas-confetti';
import { useEffect, useState } from 'react';
import { getPhaseForDate } from '../data/fastingPlan';
import { getCelebrationMessage } from '../data/encouragements';
import { evaluateBadges } from '../lib/badges';
import { formatError, messages } from '../lib/messages';
import { getJournalEntryByDate, saveCheckIn } from '../lib/storage';
import { toast } from '../lib/toast';
import type { Badge, CheckIn } from '../types';
import { BadgeSprite } from './BadgeSprite';
import { Icon } from './Icon';
import { InfoBanner } from './InfoBanner';
import { LoadingButton } from './LoadingButton';

type Props = {
  date: string;
  existing?: CheckIn;
  onClose: () => void;
  onComplete: (badges: Badge[]) => void;
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

  const phase = getPhaseForDate(date);

  useEffect(() => {
    if (getJournalEntryByDate(date)) {
      setJournaled(true);
    }
  }, [date]);

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
    } catch (err) {
      toast.error(formatError(err, messages.errors.saveCheckIn));
      setSaving(false);
      return;
    }

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
      <div className="w-full max-w-md animate-fade-in-up rounded-xl bg-surface-container-lowest p-stack-lg shadow-grace">
        {celebrating ? (
          <div className="animate-gentle-pulse py-6 text-center">
            <Icon name="celebration" className="mb-2 text-4xl text-secondary" />
            <p className="font-display text-headline-md text-primary">{message}</p>
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
          <form onSubmit={handleSubmit}>
            <h2 id="checkin-title" className="mb-stack-md font-display text-headline-md text-primary">
              Complete Today&apos;s Check-In
            </h2>

            {phase && (
              <InfoBanner variant="phase" icon="flag" className="mb-stack-md">
                Phase {phase.id}: {phase.title}
              </InfoBanner>
            )}

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

            <div className="mt-stack-md flex gap-3">
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
