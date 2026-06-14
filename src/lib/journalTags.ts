import type {
  DailyReflectionEntry,
  JournalEntry,
  JournalEntryType,
  SimpleJournalType,
} from '../types';

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

/** @deprecated Use {@link JOURNAL_ENTRY_TYPES} */
export const JOURNAL_TAGS = SIMPLE_JOURNAL_TYPES;

/** @deprecated Use {@link JOURNAL_ENTRY_TYPE_LABELS} */
export const JOURNAL_TAG_LABELS: Record<SimpleJournalType, string> = {
  prayer: JOURNAL_ENTRY_TYPE_LABELS.prayer,
  gratitude: JOURNAL_ENTRY_TYPE_LABELS.gratitude,
  victory: JOURNAL_ENTRY_TYPE_LABELS.victory,
};

export function isSimpleJournalType(value: string): value is SimpleJournalType {
  return SIMPLE_JOURNAL_TYPES.includes(value as SimpleJournalType);
}

export function isJournalEntryType(value: string): value is JournalEntryType {
  return JOURNAL_ENTRY_TYPES.includes(value as JournalEntryType);
}

/** @deprecated Use {@link isSimpleJournalType} */
export function isJournalTag(value: string): value is SimpleJournalType {
  return isSimpleJournalType(value);
}

export function isDailyReflectionEntry(
  entry: JournalEntry,
): entry is DailyReflectionEntry {
  return entry.type === 'daily-reflection';
}

const DAILY_REFLECTION_FIELD_KEYS = [
  'prayerFocus',
  'prayedAbout',
  'godTeaching',
  'hungerNotes',
  'victory',
  'tomorrowIntention',
] as const;

type LegacyJournalRecord = Record<string, unknown>;

function emptyDailyReflectionFields(): Omit<DailyReflectionEntry, 'id' | 'date' | 'updatedAt' | 'type'> {
  return {
    prayerFocus: '',
    prayedAbout: '',
    godTeaching: '',
    hungerNotes: '',
    victory: '',
    tomorrowIntention: '',
  };
}

function readDailyReflectionFields(raw: LegacyJournalRecord) {
  const fields = emptyDailyReflectionFields();
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

export function journalTypeFromTodayLabel(label: string): SimpleJournalType | null {
  const normalized = label.trim().toLowerCase();
  if (normalized === 'gratitude') return 'gratitude';
  return null;
}

/** @deprecated Use {@link journalTypeFromTodayLabel} */
export function journalTagFromTodayLabel(label: string): SimpleJournalType | null {
  return journalTypeFromTodayLabel(label);
}

export function getJournalEntryPreview(entry: JournalEntry): string {
  if (entry.type !== 'daily-reflection') {
    return entry.content || 'Reflection saved';
  }

  return (
    entry.victory ||
    entry.prayerFocus ||
    entry.prayedAbout ||
    entry.godTeaching ||
    entry.hungerNotes ||
    entry.tomorrowIntention ||
    'Reflection saved'
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

  return (
    entry.prayerFocus.toLowerCase().includes(q) ||
    entry.prayedAbout.toLowerCase().includes(q) ||
    entry.godTeaching.toLowerCase().includes(q) ||
    entry.victory.toLowerCase().includes(q) ||
    entry.hungerNotes.toLowerCase().includes(q) ||
    entry.tomorrowIntention.toLowerCase().includes(q)
  );
}
