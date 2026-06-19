import type {
  DailyReflectionEntry,
  DayMood,
  JournalEntry,
  JournalEntryType,
  SimpleJournalType,
} from '../types';
import { getDayMoodLabel, isDayMood } from './dayMood';

export const DEFAULT_JOURNAL_ENTRY_TYPE: JournalEntryType = 'daily-reflection';

export const SIMPLE_JOURNAL_TYPES: SimpleJournalType[] = ['prayer', 'gratitude', 'victory'];

export const JOURNAL_ENTRY_TYPES: JournalEntryType[] = [
  DEFAULT_JOURNAL_ENTRY_TYPE,
  ...SIMPLE_JOURNAL_TYPES,
];

export const JOURNAL_ENTRY_TYPE_LABELS: Record<JournalEntryType, string> = {
  'daily-reflection': 'Daily Reflection',
  prayer: 'Prayer',
  gratitude: 'Gratitude',
  victory: 'Victory',
};

export const DAILY_REFLECTION_FIELDS = [
  { key: 'prayerFocus', label: 'Prayer point I focused on' },
  { key: 'prayedAbout', label: 'What I prayed about' },
  { key: 'godTeaching', label: 'What God is teaching me' },
  { key: 'hungerNotes', label: 'Hunger / discipline notes' },
  { key: 'victory', label: 'Victory today' },
  { key: 'tomorrowIntention', label: "Tomorrow's intention" },
] as const satisfies ReadonlyArray<{
  key: keyof Omit<DailyReflectionEntry, 'id' | 'date' | 'updatedAt' | 'type'>;
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

export function isJournalEntryType(value: string): value is JournalEntryType {
  return JOURNAL_ENTRY_TYPES.includes(value as JournalEntryType);
}

export function isDailyReflectionEntry(
  entry: JournalEntry,
): entry is DailyReflectionEntry {
  return entry.type === 'daily-reflection';
}

const DAILY_REFLECTION_FIELD_KEYS = DAILY_REFLECTION_FIELDS.map((field) => field.key);

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
  if (isSimpleJournalType(recordType)) {
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

  if (legacyTags.length === 1) {
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
  if (entry.type !== 'daily-reflection') {
    return entry.content || 'Reflection saved';
  }

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

export function getJournalEntryTitle(entry: JournalEntry): string {
  if (entry.type === 'daily-reflection') {
    return entry.prayerFocus.trim() || JOURNAL_ENTRY_TYPE_LABELS['daily-reflection'];
  }

  const firstLine = entry.content.trim().split('\n')[0]?.trim();
  return firstLine || JOURNAL_ENTRY_TYPE_LABELS[entry.type];
}

export function journalEntryMatchesSearch(entry: JournalEntry, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  if (entry.date.includes(q)) return true;
  if (JOURNAL_ENTRY_TYPE_LABELS[entry.type].toLowerCase().includes(q)) return true;

  if (entry.type !== 'daily-reflection') {
    return entry.content.toLowerCase().includes(q);
  }

  return DAILY_REFLECTION_FIELD_KEYS.some((key) => entry[key].toLowerCase().includes(q));
}
