import confetti from 'canvas-confetti';
import { useState } from 'react';
import { getCelebrationMessage } from '../data/encouragements';
import { evaluateBadges } from '../lib/badges';
import { saveCheckIn } from '../lib/storage';
import type { Badge, CheckIn } from '../types';
import { Icon } from './Icon';

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
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const checkIn: CheckIn = {
      date,
      followedPlan,
      prayedFocus,
      readScripture,
      journaled,
      win: win.trim(),
      completedAt: new Date().toISOString(),
    };
    saveCheckIn(checkIn);
    const newBadges = evaluateBadges(date);
    setMessage(getCelebrationMessage(date));
    setCelebrating(true);

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#d2eabf', '#173d00', '#fed65b', '#f9faf0'],
    });

    setTimeout(() => {
      onComplete(newBadges);
      onClose();
    }, 2200);
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
          <div className="animate-gentle-pulse py-8 text-center">
            <Icon name="celebration" className="mb-2 text-4xl text-secondary" />
            <p className="font-display text-headline-md text-primary">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 id="checkin-title" className="mb-stack-md font-display text-headline-md text-primary">
              Complete Today&apos;s Check-In
            </h2>

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
              <button type="button" onClick={onClose} className="btn-stitch-secondary flex-1">
                Cancel
              </button>
              <button type="submit" className="btn-stitch-primary flex-1">
                Save Check-In
              </button>
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
