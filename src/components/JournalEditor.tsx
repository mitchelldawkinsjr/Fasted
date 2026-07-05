import { useEffect, useMemo, useRef, useState } from 'react';
import { trackEvent } from '../lib/analytics';
import { JournalFocusLightbox, type FocusField } from './JournalFocusLightbox';
import { JournalTextField } from './JournalTextField';
import { FocusModeToggle } from './FocusModeToggle';
import { useProgress } from '../hooks/useProgress';
import { JournalTypePicker } from './JournalTypePicker';
import { LoadingButton } from './LoadingButton';
import { MealImageUpload } from './MealImageUpload';
import { MoodPicker } from './MoodPicker';
import { VerseOfTheDayLabel } from './VerseOfTheDayLabel';
import { useActiveJourney } from '../hooks/useActiveJourney';
import { clampDateToPlan, getDefaultJournalDate } from '../lib/dateUtils';
import { deleteImages, imageScopeKey, invalidateMealImageSrcs } from '../lib/imageStore';
import {
  DEFAULT_JOURNAL_ENTRY_TYPE,
  DAILY_REFLECTION_FIELDS,
  FOOD_JOURNAL_FIELDS,
  getSimpleContentLabel,
  isDailyReflectionEntry,
  isSingleContentJournalEntry,
  isSingleContentJournalType,
  joinTrimmedValues,
} from '../lib/journalTags';
import {
  collectMealImageIds,
  emptyMealSectionImages,
  mealSectionHasImages,
} from '../lib/mealImages';
import { formatError, messages } from '../lib/messages';
import {
  createJournalEntryId,
  getMealImages,
  getStorageScope,
  saveJournalEntryWithMealImages,
  saveSettings,
} from '../lib/storage';
import { toast } from '../lib/toast';
import type {
  DailyReflectionEntry,
  DayMood,
  FoodJournalEntry,
  FoodMealKey,
  JournalEntry,
  JournalEntryType,
  MealSectionImages,
} from '../types';

type Props = {
  entry?: JournalEntry;
  defaultDate: string;
  initialType?: JournalEntryType;
  onSave: () => void;
  onCancel?: () => void;
};

export function JournalEditor({ entry, defaultDate, initialType, onSave, onCancel }: Props) {
  const progress = useProgress();
  const journalFocusMode = progress.settings.journalFocusMode !== false;
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
    entry && isSingleContentJournalEntry(entry) ? entry.content : '',
  );
  const [breakfast, setBreakfast] = useState(entry?.type === 'food' ? entry.breakfast : '');
  const [lunch, setLunch] = useState(entry?.type === 'food' ? entry.lunch : '');
  const [dinner, setDinner] = useState(entry?.type === 'food' ? entry.dinner : '');
  const [snack, setSnack] = useState(entry?.type === 'food' ? entry.snack : '');
  const [mealImages, setMealImages] = useState<Record<FoodMealKey, string[]>>(() => {
    const sections = emptyMealSectionImages();
    if (entry?.type === 'food') {
      const stored = getMealImages(entry.id);
      for (const key of Object.keys(sections) as FoodMealKey[]) {
        sections[key] = stored[key] ?? [];
      }
    }
    return sections;
  });
  const savedMealImageIds = useRef(
    new Set(
      collectMealImageIds(entry?.type === 'food' ? getMealImages(entry.id) : undefined),
    ),
  );
  const mealImagesRef = useRef(mealImages);
  mealImagesRef.current = mealImages;
  const savedSuccessfully = useRef(false);

  const discardUnsavedMealImages = (ids: string[]) => {
    const orphans = ids.filter((id) => !savedMealImageIds.current.has(id));
    if (orphans.length === 0) return;
    const scope = imageScopeKey(getStorageScope());
    invalidateMealImageSrcs(scope, orphans);
    void deleteImages(scope, orphans);
  };

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
  const [focusFieldKey, setFocusFieldKey] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (savedSuccessfully.current) return;
      discardUnsavedMealImages(collectMealImageIds(mealImagesRef.current));
    };
  }, []);

  useEffect(() => {
    setFocusFieldKey(null);
  }, [entryType, journalFocusMode]);

  const clearSimpleFields = () => {
    setContent('');
    setBreakfast('');
    setLunch('');
    setDinner('');
    setSnack('');
    setMealImages((current) => {
      discardUnsavedMealImages(collectMealImageIds(current));
      return emptyMealSectionImages();
    });
  };

  const getPreservedText = (): string => {
    if (entryType === 'daily-reflection') {
      return joinTrimmedValues([
        prayerFocus,
        prayedAbout,
        godTeaching,
        hungerNotes,
        victory,
        tomorrowIntention,
      ]);
    }
    if (entryType === 'food') {
      return joinTrimmedValues([breakfast, lunch, dinner, snack]);
    }
    return content.trim();
  };

  const handleTypeChange = (nextType: JournalEntryType) => {
    if (nextType === entryType) return;

    let preservedText = getPreservedText();
    if (entryType === 'daily-reflection' && !preservedText) {
      preservedText = content.trim();
    }

    if (nextType === 'daily-reflection') {
      setDayMood(null);
      setPrayerFocus('');
      setPrayedAbout('');
      setGodTeaching('');
      setHungerNotes('');
      setVictory('');
      setTomorrowIntention('');
    } else {
      clearSimpleFields();
      if (nextType === 'food' && preservedText) {
        setBreakfast(preservedText);
      } else if (isSingleContentJournalType(nextType) && preservedText) {
        setContent(preservedText);
      }
    }

    setEntryType(nextType);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (entryType === 'daily-reflection' && !dayMood) {
      toast.error(messages.errors.journalMoodRequired);
      return;
    }

    const hasSimpleContent = isSingleContentJournalType(entryType)
      ? content.trim().length > 0
      : entryType === 'food'
        ? [breakfast, lunch, dinner, snack].some((value) => value.trim().length > 0) ||
          mealSectionHasImages(mealImages)
        : false;

    if (entryType !== 'daily-reflection' && !hasSimpleContent) {
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
    } else {
      saved = {
        ...base,
        type: entryType,
        content: content.trim(),
      };
    }

    try {
      const imagesToSave: MealSectionImages = {};
      if (entryType === 'food') {
        for (const { key } of FOOD_JOURNAL_FIELDS) {
          if (mealImages[key].length > 0) {
            imagesToSave[key] = mealImages[key];
          }
        }
      }
      saveJournalEntryWithMealImages(saved, entryType === 'food' ? imagesToSave : undefined);
      savedSuccessfully.current = true;
      trackEvent('journal_entry_saved', {
        entry_type: entryType,
        is_update: Boolean(entry),
      });
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

  const updateMealSectionImages = (key: FoodMealKey, images: string[]) => {
    setMealImages((current) => {
      const removed = current[key].filter((id) => !images.includes(id));
      discardUnsavedMealImages(removed);
      return { ...current, [key]: images };
    });
  };

  const foodFields = FOOD_JOURNAL_FIELDS.map(({ key, label, sectionName }) => ({
    key,
    label,
    sectionName,
    value: foodFieldState[key][0],
    set: foodFieldState[key][1],
  }));

  const simpleContentLabel = getSimpleContentLabel(entryType);

  const inputClass =
    'w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md grace-shadow focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  const focusFields = useMemo((): FocusField[] => {
    if (entryType === 'daily-reflection') {
      const stripLabels: Record<string, string> = {
        prayerFocus: 'Verse',
        prayedAbout: 'Prayed',
        godTeaching: 'Teaching',
        hungerNotes: 'Feeling',
        victory: 'Victory',
        tomorrowIntention: 'Tomorrow',
      };
      return DAILY_REFLECTION_FIELDS.map(({ key, label }) => ({
        key,
        label,
        ariaLabel: label,
        stripLabel: stripLabels[key] ?? label,
      }));
    }
    if (entryType === 'food') {
      return FOOD_JOURNAL_FIELDS.map(({ key, label, sectionName }) => ({
        key,
        label,
        ariaLabel: label,
        stripLabel: sectionName,
      }));
    }
    return [
      {
        key: 'content',
        label: simpleContentLabel,
        ariaLabel: simpleContentLabel,
        stripLabel: simpleContentLabel,
      },
    ];
  }, [entryType, simpleContentLabel]);

  const focusValues = useMemo((): Record<string, string> => {
    if (entryType === 'daily-reflection') {
      return {
        prayerFocus,
        prayedAbout,
        godTeaching,
        hungerNotes,
        victory,
        tomorrowIntention,
      };
    }
    if (entryType === 'food') {
      return { breakfast, lunch, dinner, snack };
    }
    return { content };
  }, [
    breakfast,
    content,
    dinner,
    entryType,
    godTeaching,
    hungerNotes,
    lunch,
    prayedAbout,
    prayerFocus,
    snack,
    tomorrowIntention,
    victory,
  ]);

  const handleFocusChange = (key: string, value: string) => {
    if (entryType === 'daily-reflection') {
      const setter = dailyFieldState[key as keyof typeof dailyFieldState];
      if (setter) setter[1](value);
      return;
    }
    if (entryType === 'food') {
      const setter = foodFieldState[key as keyof typeof foodFieldState];
      if (setter) setter[1](value);
      return;
    }
    if (key === 'content') setContent(value);
  };

  const openFocusField = (key: string) => {
    if (!journalFocusMode) return;
    setFocusFieldKey(key);
  };

  const handleFocusModeToggle = (enabled: boolean) => {
    if (!enabled) setFocusFieldKey(null);
    saveSettings({ journalFocusMode: enabled });
    trackEvent('journal_focus_mode_toggled', { enabled });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-stack-md"
      noValidate
    >
      <div className="min-h-0 min-w-0 flex-1 space-y-stack-md overflow-y-auto overscroll-contain pb-2">
      <section className="stitch-card space-y-stack-md overflow-hidden p-stack-md">
        <label className="block min-w-0">
          <span className="mb-1 block text-body-md font-medium text-on-surface">Date</span>
          <div className="min-w-0 overflow-hidden rounded-xl">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(clampDateToPlan(e.target.value))}
              min={planStart}
              max={planEnd}
              required
              className={`date-input ${inputClass}`}
            />
          </div>
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
              <JournalTextField
                value={field.value}
                onChange={field.set}
                placeholder={
                  field.key === 'prayerFocus' ? 'Write your reflection…' : `${field.label}…`
                }
                ariaLabel={field.label}
                inputClass={inputClass}
                focusModeEnabled={journalFocusMode}
                isActive={focusFieldKey === field.key}
                lightboxOpen={focusFieldKey === field.key}
                onOpen={() => openFocusField(field.key)}
              />
            </label>
          ))}
        </>
      ) : entryType === 'food' ? (
        foodFields.map((field) => (
          <div key={field.key} className="block">
            <label className="block">
              <span className="mb-1 block text-body-md font-medium text-on-surface">
                {field.label}
              </span>
              <JournalTextField
                value={field.value}
                onChange={field.set}
                placeholder={`${field.label}…`}
                ariaLabel={field.label}
                inputClass={inputClass}
                focusModeEnabled={journalFocusMode}
                isActive={focusFieldKey === field.key}
                lightboxOpen={focusFieldKey === field.key}
                onOpen={() => openFocusField(field.key)}
              />
            </label>
            <MealImageUpload
              images={mealImages[field.key]}
              onChange={(images) => updateMealSectionImages(field.key, images)}
              sectionName={field.sectionName}
            />
          </div>
        ))
      ) : (
        <label className="block">
          <span className="mb-1 block text-body-md font-medium text-on-surface">
            {simpleContentLabel}
          </span>
          <JournalTextField
            value={content}
            onChange={setContent}
            placeholder={`${simpleContentLabel}…`}
            ariaLabel={simpleContentLabel}
            inputClass={inputClass}
            focusModeEnabled={journalFocusMode}
            isActive={focusFieldKey === 'content'}
            lightboxOpen={focusFieldKey === 'content'}
            onOpen={() => openFocusField('content')}
            rows={entryType === 'fitness' ? 4 : 6}
          />
        </label>
      )}
      </div>

      {journalFocusMode && focusFieldKey && (
        <JournalFocusLightbox
          fields={focusFields}
          activeKey={focusFieldKey}
          values={focusValues}
          onChange={handleFocusChange}
          onNavigate={setFocusFieldKey}
          onClose={() => setFocusFieldKey(null)}
          date={date}
          entryType={entryType}
        />
      )}

      <div className="flex shrink-0 justify-center pb-2">
        <FocusModeToggle enabled={journalFocusMode} onChange={handleFocusModeToggle} />
      </div>

      <div className="flex shrink-0 gap-3 border-t border-outline-variant/30 bg-linen pt-3">
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
