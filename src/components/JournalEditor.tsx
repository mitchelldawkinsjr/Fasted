import { useMemo, useState } from 'react';
import { PLAN_END, PLAN_START } from '../data/fastingPlan';
import { createJournalEntryId, saveJournalEntry } from '../lib/storage';
import type { JournalEntry } from '../types';

type Props = {
  entry?: JournalEntry;
  defaultDate: string;
  onSave: () => void;
  onCancel?: () => void;
};

export function JournalEditor({ entry, defaultDate, onSave, onCancel }: Props) {
  const [date, setDate] = useState(entry?.date ?? defaultDate);
  const [prayerFocus, setPrayerFocus] = useState(entry?.prayerFocus ?? '');
  const [prayedAbout, setPrayedAbout] = useState(entry?.prayedAbout ?? '');
  const [godTeaching, setGodTeaching] = useState(entry?.godTeaching ?? '');
  const [hungerNotes, setHungerNotes] = useState(entry?.hungerNotes ?? '');
  const [victory, setVictory] = useState(entry?.victory ?? '');
  const [tomorrowIntention, setTomorrowIntention] = useState(
    entry?.tomorrowIntention ?? '',
  );

  const dateBounds = useMemo(() => {
    const selectedDate = date || entry?.date || defaultDate;

    return {
      min: selectedDate < PLAN_START ? selectedDate : PLAN_START,
      max: selectedDate > PLAN_END ? selectedDate : PLAN_END,
    };
  }, [date, defaultDate, entry?.date]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const saved: JournalEntry = {
      id: entry?.id ?? createJournalEntryId(),
      date,
      prayerFocus,
      prayedAbout,
      godTeaching,
      hungerNotes,
      victory,
      tomorrowIntention,
      updatedAt: new Date().toISOString(),
    };
    saveJournalEntry(saved);
    onSave();
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
    <form onSubmit={handleSubmit} className="space-y-stack-md">
      <label className="block">
        <span className="mb-1 block text-body-md font-medium text-on-surface">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={dateBounds.min}
          max={dateBounds.max}
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
          <button type="button" onClick={onCancel} className="btn-stitch-secondary flex-1">
            Cancel
          </button>
        )}
        <button type="submit" className="btn-stitch-primary flex-1">
          Save Entry
        </button>
      </div>
    </form>
  );
}
