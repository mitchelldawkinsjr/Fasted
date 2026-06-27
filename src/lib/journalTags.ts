import type {
  ContentSimpleJournalType,
  DailyReflectionEntry,
  DayMood,
  FitnessJournalEntry,
  FoodJournalEntry,
  JournalEntry,
  JournalEntryType,
  SimpleJournalType,
} from '../types';
import { getDayMoodLabel, isDayMood } from './dayMood';

export const DEFAULT_JOURNAL_ENTRY_TYPE: JournalEntryType = 'daily-reflection';

export const CONTENT_SIMPLE_JOURNAL_TYPES: ContentSimpleJournalType[] = [
  'prayer',
  'gratitude',
  'victory',
];

export const SIMPLE_JOURNAL_TYPES: SimpleJournalType[] = [
  ...CONTENT_SIMPLE_JOURNAL_TYPES,
  'food',
  'fitness',
];

export const JOURNAL_ENTRY_TYPES: JournalEntryType[] = [
  DEFAULT_JOURNAL_ENTRY_TYPE,
  ...SIMPLE_JOURNAL_TYPES,
];

export const JOURNAL_ENTRY_TYPE_LABELS: Record<JournalEntryType, string> = {
  'daily-reflection': 'Daily Reflection',
  prayer: 'Prayer',
  gratitude: 'Gratitude',
  victory: 'Victory',
  food: 'Food',
  fitness: 'Fitness',
};

export const VERSE_OF_THE_DAY_LABEL = 'Verse of the Day';

export const DAILY_REFLECTION_FIELDS = [
  { key: 'prayerFocus', label: VERSE_OF_THE_DAY_LABEL },
  { key: 'prayedAbout', label: 'What I prayed about' },
  { key: 'godTeaching', label: 'What God is teaching me' },
  { key: 'hungerNotes', label: "What do you think contributed most to how you're feeling today?" },
  { key: 'victory', label: 'Victory today' },
  { key: 'tomorrowIntention', label: "Tomorrow's intention" },
] as const satisfies ReadonlyArray<{
  key: keyof Omit<DailyReflectionEntry, 'id' | 'date' | 'updatedAt' | 'type'>;
  label: string;
}>;

export const FOOD_JOURNAL_FIELDS = [
  { key: 'breakfast', label: 'What did you eat for breakfast?' },
  { key: 'lunch', label: 'What did you eat for lunch?' },
  { key: 'dinner', label: 'What did you eat for dinner?' },
  { key: 'snack', label: 'What did you eat as a snack?' },
] as const satisfies ReadonlyArray<{
  key: keyof Omit<FoodJournalEntry, 'id' | 'date' | 'updatedAt' | 'type'>;
  label: string;
}>;

export const FITNESS_JOURNAL_FIELDS = [
  { key: 'movement', label: 'How did you move your body today?' },
] as const satisfies ReadonlyArray<{
  key: keyof Omit<FitnessJournalEntry, 'id' | 'date' | 'updatedAt' | 'type'>;
  label: string;
}>;

export const JOURNAL_TYPE_PILL_BASE_CLASS =
  'flex min-h-[2.75rem] items-center justify-center rounded-full px-2 py-1.5 text-center label-caps leading-tight transition-colors';

export function journalTypePillClass(selected: boolean): string {
  return selected
    ? `${JOURNAL_TYPE_PILL_BASE_CLASS} bg-primary text-on-primary grace-shadow`
    : `${JOURNAL_TYPE_PILL_BASE_CLASS} border border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-variant`;
}

export function isSimpleJournalType(value: string): value is SimpleJournalType {
  return SIMPLE_JOURNAL_TYPES.includes(value as SimpleJournalType);
}

export function isContentSimpleJournalType(value: string): value is ContentSimpleJournalType {
  return CONTENT_SIMPLE_JOURNAL_TYPES.includes(value as ContentSimpleJournalType);
}

export function isJournalEntryType(value: string): value is JournalEntryType {
  return JOURNAL_ENTRY_TYPES.includes(value as JournalEntryType);
}

export function isDailyReflectionEntry(
  entry: JournalEntry,
): entry is DailyReflectionEntry {
  return entry.type === 'daily-reflection';
}

export function isContentSimpleJournalEntry(
  entry: JournalEntry,
): entry is JournalEntry & { type: ContentSimpleJournalType; content: string } {
  return isContentSimpleJournalType(entry.type);
}

export function isFoodJournalEntry(entry: JournalEntry): entry is FoodJournalEntry {
  return entry.type === 'food';
}

export function isFitnessJournalEntry(entry: JournalEntry): entry is FitnessJournalEntry {
  return entry.type === 'fitness';
}

const DAILY_REFLECTION_FIELD_KEYS = DAILY_REFLECTION_FIELDS.map((field) => field.key);
const FOOD_JOURNAL_FIELD_KEYS = FOOD_JOURNAL_FIELDS.map((field) => field.key);
const FITNESS_JOURNAL_FIELD_KEYS = FITNESS_JOURNAL_FIELDS.map((field) => field.key);

type LegacyJournalRecord = Record<string, unknown>;

function emptyDailyReflectionFields(): Omit<DailyReflectionEntry, 'id' | 'date' | 'updatedAt' | 'type'> {
  return {
    dayMood: null,
    prayerFocus: '',
    prayedAbout: '',
    godTeaching: '',
    hungerNotes: '',
    victory: '',
    tomorrowIntention: '',
  };
}

function readDayMood(raw: LegacyJournalRecord): DayMood | null {
  return isDayMood(raw.dayMood) ? raw.dayMood : null;
}

function readDailyReflectionFields(raw: LegacyJournalRecord) {
  const fields = emptyDailyReflectionFields();
  fields.dayMood = readDayMood(raw);
  for (const key of DAILY_REFLECTION_FIELD_KEYS) {
    fields[key] = typeof raw[key] === 'string' ? raw[key] : '';
  }
  return fields;
}

function emptyFoodJournalFields(): Omit<FoodJournalEntry, 'id' | 'date' | 'updatedAt' | 'type'> {
  return {
    breakfast: '',
    lunch: '',
    dinner: '',
    snack: '',
  };
}

function emptyFitnessJournalFields(): Omit<
  FitnessJournalEntry,
  'id' | 'date' | 'updatedAt' | 'type'
> {
  return {
    movement: '',
  };
}

function readFoodJournalFields(raw: LegacyJournalRecord) {
  const fields = emptyFoodJournalFields();
  for (const key of FOOD_JOURNAL_FIELD_KEYS) {
    fields[key] = typeof raw[key] === 'string' ? raw[key] : '';
  }
  return fields;
}

function readFitnessJournalFields(raw: LegacyJournalRecord) {
  const fields = emptyFitnessJournalFields();
  for (const key of FITNESS_JOURNAL_FIELD_KEYS) {
    fields[key] = typeof raw[key] === 'string' ? raw[key] : '';
  }
  return fields;
}

function joinFilledFoodFields(fields: ReturnType<typeof readFoodJournalFields>): string {
  return FOOD_JOURNAL_FIELD_KEYS.map((key) => fields[key].trim())
    .filter(Boolean)
    .join('\n\n');
}

function joinFilledReflectionFields(
  fields: ReturnType<typeof readDailyReflectionFields>,
): string {
  return DAILY_REFLECTION_FIELD_KEYS.map((key) => fields[key].trim())
    .filter(Boolean)
    .join('\n\n');
}

function normalizeLegacyTags(raw: LegacyJournalRecord): SimpleJournalType[] {
  if (!Array.isArray(raw.tags)) return [];
  return raw.tags.filter(
    (tag): tag is SimpleJournalType => typeof tag === 'string' && isSimpleJournalType(tag),
  );
}

function baseFields(raw: LegacyJournalRecord): Pick<JournalEntry, 'id' | 'date' | 'updatedAt'> {
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    date: typeof raw.date === 'string' ? raw.date : '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

export function journalEntryNeedsMigration(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const record = raw as LegacyJournalRecord;
  if (Array.isArray(record.tags) && record.tags.length > 0) return true;
  if (record.type === 'daily-reflection') return 'content' in record || 'tags' in record;
  if (isSimpleJournalType(String(record.type))) return 'tags' in record;
  return !record.type;
}

export function normalizeJournalEntry(raw: unknown): JournalEntry {
  const record = (raw ?? {}) as LegacyJournalRecord;
  const base = baseFields(record);

  if (record.type === 'daily-reflection') {
    return {
      ...base,
      type: 'daily-reflection',
      ...readDailyReflectionFields(record),
    };
  }

  const recordType = typeof record.type === 'string' ? record.type : '';
  if (recordType === 'food') {
    return {
      ...base,
      type: 'food',
      ...readFoodJournalFields(record),
    };
  }
  if (recordType === 'fitness') {
    return {
      ...base,
      type: 'fitness',
      ...readFitnessJournalFields(record),
    };
  }
  if (isContentSimpleJournalType(recordType)) {
    return {
      ...base,
      type: recordType,
      content: typeof record.content === 'string' ? record.content : '',
    };
  }

  const legacyTags = normalizeLegacyTags(record);
  const reflectionFields = readDailyReflectionFields(record);

  if (legacyTags.length > 1) {
    return {
      ...base,
      type: 'daily-reflection',
      ...reflectionFields,
    };
  }

  if (legacyTags.length === 1 && isContentSimpleJournalType(legacyTags[0])) {
    return {
      ...base,
      type: legacyTags[0],
      content: joinFilledReflectionFields(reflectionFields),
    };
  }

  return {
    ...base,
    type: 'daily-reflection',
    ...reflectionFields,
  };
}

export function normalizeJournalEntries(entries: unknown[]): JournalEntry[] {
  return entries.map(normalizeJournalEntry);
}

export function getJournalEntryPreview(entry: JournalEntry): string {
  if (entry.type === 'daily-reflection') {
    const moodPrefix = entry.dayMood ? `${getDayMoodLabel(entry.dayMood)} day — ` : '';

    return (
      moodPrefix +
      (entry.victory ||
        entry.prayerFocus ||
        entry.prayedAbout ||
        entry.godTeaching ||
        entry.hungerNotes ||
        entry.tomorrowIntention ||
        'Reflection saved')
    );
  }

  if (isContentSimpleJournalEntry(entry)) {
    return entry.content || 'Reflection saved';
  }

  if (isFoodJournalEntry(entry)) {
    return joinFilledFoodFields(entry) || 'Reflection saved';
  }

  return entry.movement || 'Reflection saved';
}

export function getJournalEntryTitle(entry: JournalEntry): string {
  if (entry.type === 'daily-reflection') {
    return entry.prayerFocus.trim() || JOURNAL_ENTRY_TYPE_LABELS['daily-reflection'];
  }

  if (isContentSimpleJournalEntry(entry)) {
    const firstLine = entry.content.trim().split('\n')[0]?.trim();
    return firstLine || JOURNAL_ENTRY_TYPE_LABELS[entry.type];
  }

  if (isFoodJournalEntry(entry)) {
    const preview = joinFilledFoodFields(entry).split('\n\n')[0]?.trim();
    return preview || JOURNAL_ENTRY_TYPE_LABELS.food;
  }

  return entry.movement.trim() || JOURNAL_ENTRY_TYPE_LABELS.fitness;
}

export function journalEntryMatchesSearch(entry: JournalEntry, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  if (entry.date.includes(q)) return true;
  if (JOURNAL_ENTRY_TYPE_LABELS[entry.type].toLowerCase().includes(q)) return true;

  if (entry.type === 'daily-reflection') {
    return DAILY_REFLECTION_FIELD_KEYS.some((key) => entry[key].toLowerCase().includes(q));
  }

  if (isContentSimpleJournalEntry(entry)) {
    return entry.content.toLowerCase().includes(q);
  }

  if (isFoodJournalEntry(entry)) {
    return FOOD_JOURNAL_FIELD_KEYS.some((key) => entry[key].toLowerCase().includes(q));
  }

  return entry.movement.toLowerCase().includes(q);
}
