import { useState } from 'react';
import { LoadingButton } from '../components/LoadingButton';
import { PLAN_END, PLAN_START } from '../data/fastingPlan';
import { clampDateToPlan, getDefaultJournalDate } from '../lib/dateUtils';
import { formatError, messages } from '../lib/messages';
import { createJournalEntryId, saveJournalEntry } from '../lib/storage';
import { toast } from '../lib/toast';
import type { JournalEntry } from '../types';

type Props = {
  entry?: JournalEntry;
  defaultDate: string;
  onSave: () => void;
  onCancel?: () => void;
};

export function JournalEditor({ entry, defaultDate, onSave, onCancel }: Props) {
  const initialDate = clampDateToPlan(entry?.date ?? defaultDate ?? getDefaultJournalDate());
  const [date, setDate] = useState(initialDate);
  const [prayerFocus, setPrayerFocus] = useState(entry?.prayerFocus ?? '');
  const [prayedAbout, setPrayedAbout] = useState(entry?.prayedAbout ?? '');
  const [godTeaching, setGodTeaching] = useState(entry?.godTeaching ?? '');
  const [hungerNotes, setHungerNotes] = useState(entry?.hungerNotes ?? '');
  const [victory, setVictory] = useState(entry?.victory ?? '');
  const [tomorrowIntention, setTomorrowIntention] = useState(
    entry?.tomorrowIntention ?? '',
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const savedDate = clampDateToPlan(date);
    const saved: JournalEntry = {
      id: entry?.id ?? createJournalEntryId(),
      date: savedDate,
      prayerFocus: prayerFocus.trim(),
      prayedAbout: prayedAbout.trim(),
      godTeaching: godTeaching.trim(),
      hungerNotes: hungerNotes.trim(),
      victory: victory.trim(),
      tomorrowIntention: tomorrowIntention.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      saveJournalEntry(saved);
      toast.success(entry ? messages.save.journalUpdated : messages.save.journal);
      onSave();
    } catch (err) {
      toast.error(formatError(err, messages.errors.saveJournal));
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: 'Prayer point I focused on', value: prayerFocus, set: setPrayerFocus },
    { label: 'What I prayed about', value: prayedAbout, set: setPrayedAbout },
    { label: 'What God is teaching me', value: godTeaching, set: setGodTeaching },
    { label: 'Hunger / discipline notes', value: hungerNotes, set: setHungerNotes },
    { label: 'Victory today', value: victory, set: setVictory },
    { label: "Tomorrow's intention", value: tomorrowIntention, set: setTomorrowIntention },
  ];

  const inputClass =
    'w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md grace-shadow focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  return (
    <form onSubmit={handleSubmit} className="space-y-stack-md" noValidate>
      <label className="block">
        <span className="mb-1 block text-body-md font-medium text-on-surface">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(clampDateToPlan(e.target.value))}
          min={PLAN_START}
          max={PLAN_END}
          required
          className={inputClass}
        />
      </label>

      {fields.map((field) => (
        <label key={field.label} className="block">
          <span className="mb-1 block text-body-md font-medium text-on-surface">{field.label}</span>
          <textarea
            value={field.value}
            onChange={(e) => field.set(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </label>
      ))}

      <div className="flex gap-3">
        {onCancel && (
          <LoadingButton type="button" onClick={onCancel} variant="secondary" className="flex-1">
            Cancel
          </LoadingButton>
        )}
        <LoadingButton
          type="submit"
          loading={saving}
          loadingLabel="Saving…"
          className="flex-1"
        >
          Save Entry
        </LoadingButton>
      </div>
    </form>
  );
}
