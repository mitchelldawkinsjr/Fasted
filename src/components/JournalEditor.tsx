import { useState } from 'react';
import { JournalTypePicker } from './JournalTypePicker';
import { LoadingButton } from './LoadingButton';
import { PLAN_END, PLAN_START } from '../data/fastingPlan';
import { clampDateToPlan, getDefaultJournalDate } from '../lib/dateUtils';
import {
  DEFAULT_JOURNAL_ENTRY_TYPE,
  JOURNAL_ENTRY_TYPE_LABELS,
  isDailyReflectionEntry,
} from '../lib/journalTags';
import { formatError, messages } from '../lib/messages';
import { createJournalEntryId, saveJournalEntry } from '../lib/storage';
import { toast } from '../lib/toast';
import type { DailyReflectionEntry, JournalEntry, JournalEntryType } from '../types';

type Props = {
  entry?: JournalEntry;
  defaultDate: string;
  initialType?: JournalEntryType;
  onSave: () => void;
  onCancel?: () => void;
};

export function JournalEditor({ entry, defaultDate, initialType, onSave, onCancel }: Props) {
  const initialDate = clampDateToPlan(entry?.date ?? defaultDate ?? getDefaultJournalDate());
  const [date, setDate] = useState(initialDate);
  const [entryType, setEntryType] = useState<JournalEntryType>(
    entry?.type ?? initialType ?? DEFAULT_JOURNAL_ENTRY_TYPE,
  );
  const [content, setContent] = useState(
    entry && !isDailyReflectionEntry(entry) ? entry.content : '',
  );
  const [prayerFocus, setPrayerFocus] = useState(
    entry && isDailyReflectionEntry(entry) ? entry.prayerFocus : '',
  );
  const [prayedAbout, setPrayedAbout] = useState(
    entry && isDailyReflectionEntry(entry) ? entry.prayedAbout : '',
  );
  const [godTeaching, setGodTeaching] = useState(
    entry && isDailyReflectionEntry(entry) ? entry.godTeaching : '',
  );
  const [hungerNotes, setHungerNotes] = useState(
    entry && isDailyReflectionEntry(entry) ? entry.hungerNotes : '',
  );
  const [victory, setVictory] = useState(
    entry && isDailyReflectionEntry(entry) ? entry.victory : '',
  );
  const [tomorrowIntention, setTomorrowIntention] = useState(
    entry && isDailyReflectionEntry(entry) ? entry.tomorrowIntention : '',
  );
  const [saving, setSaving] = useState(false);

  const handleTypeChange = (nextType: JournalEntryType) => {
    if (nextType === entryType) return;

    if (entryType === 'daily-reflection' && nextType !== 'daily-reflection') {
      const joined = [
        prayerFocus,
        prayedAbout,
        godTeaching,
        hungerNotes,
        victory,
        tomorrowIntention,
      ]
        .map((value) => value.trim())
        .filter(Boolean)
        .join('\n\n');
      setContent(joined);
    } else if (entryType !== 'daily-reflection' && nextType === 'daily-reflection') {
      setPrayerFocus('');
      setPrayedAbout('');
      setGodTeaching('');
      setHungerNotes('');
      setVictory('');
      setTomorrowIntention('');
    } else {
      setContent('');
    }

    setEntryType(nextType);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (entryType !== 'daily-reflection' && !content.trim()) {
      toast.error(messages.errors.journalContentRequired);
      return;
    }

    setSaving(true);

    const savedDate = clampDateToPlan(date);
    const base = {
      id: entry?.id ?? createJournalEntryId(),
      date: savedDate,
      updatedAt: new Date().toISOString(),
    };

    const saved: JournalEntry =
      entryType === 'daily-reflection'
        ? ({
            ...base,
            type: 'daily-reflection',
            prayerFocus: prayerFocus.trim(),
            prayedAbout: prayedAbout.trim(),
            godTeaching: godTeaching.trim(),
            hungerNotes: hungerNotes.trim(),
            victory: victory.trim(),
            tomorrowIntention: tomorrowIntention.trim(),
          } satisfies DailyReflectionEntry)
        : {
            ...base,
            type: entryType,
            content: content.trim(),
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

  const dailyFields = [
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
      <section className="stitch-card space-y-stack-md p-stack-md">
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

        <JournalTypePicker
          value={entryType}
          onChange={handleTypeChange}
          prefilled={!entry && Boolean(initialType)}
        />
      </section>

      {entryType === 'daily-reflection' ? (
        dailyFields.map((field) => (
          <label key={field.label} className="block">
            <span className="mb-1 block text-body-md font-medium text-on-surface">
              {field.label}
            </span>
            <textarea
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </label>
        ))
      ) : (
        <label className="block">
          <span className="mb-1 block text-body-md font-medium text-on-surface">
            {JOURNAL_ENTRY_TYPE_LABELS[entryType]}
          </span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className={inputClass}
            aria-label={JOURNAL_ENTRY_TYPE_LABELS[entryType]}
          />
        </label>
      )}

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
