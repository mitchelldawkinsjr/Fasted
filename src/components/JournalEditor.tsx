import { useState } from 'react';
import { JournalTypePicker } from './JournalTypePicker';
import { LoadingButton } from './LoadingButton';
import { MoodPicker } from './MoodPicker';
import { VerseOfTheDayLabel } from './VerseOfTheDayLabel';
import { useActiveJourney } from '../hooks/useActiveJourney';
import { clampDateToPlan, getDefaultJournalDate } from '../lib/dateUtils';
import {
  DEFAULT_JOURNAL_ENTRY_TYPE,
  DAILY_REFLECTION_FIELDS,
  FITNESS_JOURNAL_FIELDS,
  FOOD_JOURNAL_FIELDS,
  JOURNAL_ENTRY_TYPE_LABELS,
  isContentSimpleJournalEntry,
  isContentSimpleJournalType,
  isDailyReflectionEntry,
  isFitnessJournalEntry,
  isFoodJournalEntry,
} from '../lib/journalTags';
import { formatError, messages } from '../lib/messages';
import { createJournalEntryId, saveJournalEntry } from '../lib/storage';
import { toast } from '../lib/toast';
import type {
  DailyReflectionEntry,
  DayMood,
  FitnessJournalEntry,
  FoodJournalEntry,
  JournalEntry,
  JournalEntryType,
} from '../types';

type Props = {
  entry?: JournalEntry;
  defaultDate: string;
  initialType?: JournalEntryType;
  onSave: () => void;
  onCancel?: () => void;
};

export function JournalEditor({ entry, defaultDate, initialType, onSave, onCancel }: Props) {
  const { planStart, planEnd } = useActiveJourney();
  const initialDate = clampDateToPlan(entry?.date ?? defaultDate ?? getDefaultJournalDate());
  const [date, setDate] = useState(initialDate);
  const [entryType, setEntryType] = useState<JournalEntryType>(
    entry?.type ?? initialType ?? DEFAULT_JOURNAL_ENTRY_TYPE,
  );
  const [dayMood, setDayMood] = useState<DayMood | null>(
    entry && isDailyReflectionEntry(entry) ? entry.dayMood ?? null : null,
  );
  const [content, setContent] = useState(
    entry && isContentSimpleJournalEntry(entry) ? entry.content : '',
  );
  const [breakfast, setBreakfast] = useState(
    entry && isFoodJournalEntry(entry) ? entry.breakfast : '',
  );
  const [lunch, setLunch] = useState(entry && isFoodJournalEntry(entry) ? entry.lunch : '');
  const [dinner, setDinner] = useState(entry && isFoodJournalEntry(entry) ? entry.dinner : '');
  const [snack, setSnack] = useState(entry && isFoodJournalEntry(entry) ? entry.snack : '');
  const [movement, setMovement] = useState(
    entry && isFitnessJournalEntry(entry) ? entry.movement : '',
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

  const clearSimpleFields = () => {
    setContent('');
    setBreakfast('');
    setLunch('');
    setDinner('');
    setSnack('');
    setMovement('');
  };

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
      clearSimpleFields();
      if (isContentSimpleJournalType(nextType)) {
        setContent(joined);
      }
    } else if (entryType !== 'daily-reflection' && nextType === 'daily-reflection') {
      setDayMood(null);
      setPrayerFocus('');
      setPrayedAbout('');
      setGodTeaching('');
      setHungerNotes('');
      setVictory('');
      setTomorrowIntention('');
      clearSimpleFields();
    } else {
      clearSimpleFields();
    }

    setEntryType(nextType);
  };

  const simpleEntryHasContent = (): boolean => {
    if (isContentSimpleJournalType(entryType)) {
      return content.trim().length > 0;
    }
    if (entryType === 'food') {
      return [breakfast, lunch, dinner, snack].some((value) => value.trim().length > 0);
    }
    if (entryType === 'fitness') {
      return movement.trim().length > 0;
    }
    return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (entryType === 'daily-reflection' && !dayMood) {
      toast.error(messages.errors.journalMoodRequired);
      return;
    }

    if (entryType !== 'daily-reflection' && !simpleEntryHasContent()) {
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

    let saved: JournalEntry;
    if (entryType === 'daily-reflection') {
      saved = {
        ...base,
        type: 'daily-reflection',
        dayMood,
        prayerFocus: prayerFocus.trim(),
        prayedAbout: prayedAbout.trim(),
        godTeaching: godTeaching.trim(),
        hungerNotes: hungerNotes.trim(),
        victory: victory.trim(),
        tomorrowIntention: tomorrowIntention.trim(),
      } satisfies DailyReflectionEntry;
    } else if (entryType === 'food') {
      saved = {
        ...base,
        type: 'food',
        breakfast: breakfast.trim(),
        lunch: lunch.trim(),
        dinner: dinner.trim(),
        snack: snack.trim(),
      } satisfies FoodJournalEntry;
    } else if (entryType === 'fitness') {
      saved = {
        ...base,
        type: 'fitness',
        movement: movement.trim(),
      } satisfies FitnessJournalEntry;
    } else {
      saved = {
        ...base,
        type: entryType,
        content: content.trim(),
      };
    }

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

  const dailyFieldState = {
    prayerFocus: [prayerFocus, setPrayerFocus] as const,
    prayedAbout: [prayedAbout, setPrayedAbout] as const,
    godTeaching: [godTeaching, setGodTeaching] as const,
    hungerNotes: [hungerNotes, setHungerNotes] as const,
    victory: [victory, setVictory] as const,
    tomorrowIntention: [tomorrowIntention, setTomorrowIntention] as const,
  };

  const dailyFields = DAILY_REFLECTION_FIELDS.map(({ key, label }) => ({
    key,
    label,
    value: dailyFieldState[key][0],
    set: dailyFieldState[key][1],
  }));

  const foodFieldState = {
    breakfast: [breakfast, setBreakfast] as const,
    lunch: [lunch, setLunch] as const,
    dinner: [dinner, setDinner] as const,
    snack: [snack, setSnack] as const,
  };

  const foodFields = FOOD_JOURNAL_FIELDS.map(({ key, label }) => ({
    key,
    label,
    value: foodFieldState[key][0],
    set: foodFieldState[key][1],
  }));

  const fitnessFieldState = {
    movement: [movement, setMovement] as const,
  };

  const fitnessFields = FITNESS_JOURNAL_FIELDS.map(({ key, label }) => ({
    key,
    label,
    value: fitnessFieldState[key][0],
    set: fitnessFieldState[key][1],
  }));

  const inputClass =
    'w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md grace-shadow focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  return (
    <form onSubmit={handleSubmit} className="space-y-stack-md" noValidate>
      <section className="stitch-card space-y-stack-md overflow-hidden p-stack-md">
        <label className="block min-w-0 overflow-hidden">
          <span className="mb-1 block text-body-md font-medium text-on-surface">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(clampDateToPlan(e.target.value))}
            min={planStart}
            max={planEnd}
            required
            className={`date-input ${inputClass}`}
          />
        </label>

        <JournalTypePicker
          value={entryType}
          onChange={handleTypeChange}
          prefilled={!entry && Boolean(initialType)}
        />
      </section>

      {entryType === 'daily-reflection' ? (
        <>
          <section className="stitch-card min-w-0 overflow-hidden p-stack-md">
            <MoodPicker value={dayMood} onChange={setDayMood} />
          </section>
          {dailyFields.map((field) => (
            <label key={field.key} className="block">
              {field.key === 'prayerFocus' ? (
                <VerseOfTheDayLabel date={date} />
              ) : (
                <span className="mb-1 block text-body-md font-medium text-on-surface">
                  {field.label}
                </span>
              )}
              <textarea
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                rows={2}
                className={inputClass}
                aria-label={field.label}
              />
            </label>
          ))}
        </>
      ) : entryType === 'food' ? (
        foodFields.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-1 block text-body-md font-medium text-on-surface">
              {field.label}
            </span>
            <textarea
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              rows={2}
              className={inputClass}
              aria-label={field.label}
            />
          </label>
        ))
      ) : entryType === 'fitness' ? (
        fitnessFields.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-1 block text-body-md font-medium text-on-surface">
              {field.label}
            </span>
            <textarea
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              rows={4}
              className={inputClass}
              aria-label={field.label}
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
