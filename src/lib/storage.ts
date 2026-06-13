import type {
  AppSettings,
  Badge,
  CheckIn,
  JournalEntry,
  UserProgress,
} from '../types';
import { normalizeJournalTags } from './journalTags';
import { messages } from './messages';
import { scheduleCloudSync } from './sync';

/** @deprecated Legacy key — migrated to {@link GUEST_STORAGE_KEY} on first load. */
export const LEGACY_STORAGE_KEY = 'fasted-calendar-progress';

export const GUEST_STORAGE_KEY = 'fasted-calendar-progress:guest';

export function userStorageKey(userId: string): string {
  return `fasted-calendar-progress:${userId}`;
}

const DEFAULT_SETTINGS: AppSettings = {
  reminderTime: '07:00',
  theme: 'light',
  scriptureNote:
    'Scripture text uses NLT (New Living Translation) wording where available. Some phases use a brief summary when multiple readings are assigned.',
};

const DEFAULT_PROGRESS: UserProgress = {
  checkIns: [],
  journalEntries: [],
  badges: [],
  settings: DEFAULT_SETTINGS,
};

/** `null` = guest (unsigned) scope. */
let currentScope: string | null = null;
let cache: UserProgress | null = null;
const listeners = new Set<() => void>();

function getActiveStorageKey(): string {
  return currentScope ? userStorageKey(currentScope) : GUEST_STORAGE_KEY;
}

export function getStorageScope(): string | null {
  return currentScope;
}

/** Move pre-scoping data into the guest key once. */
export function migrateLegacyStorage(): void {
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return;
  if (!localStorage.getItem(GUEST_STORAGE_KEY)) {
    localStorage.setItem(GUEST_STORAGE_KEY, legacy);
  }
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

/** Switch the active local cache to a user account or guest mode. */
export function switchStorageScope(userId: string | null): void {
  currentScope = userId;
  cache = null;
  notify();
}

function normalizeJournalEntry(entry: JournalEntry): JournalEntry {
  return {
    ...entry,
    tags: normalizeJournalTags(entry.tags),
  };
}

function normalizeJournalEntries(entries: JournalEntry[]): JournalEntry[] {
  return entries.map(normalizeJournalEntry);
}

function loadRaw(): UserProgress {
  try {
    const raw = localStorage.getItem(getActiveStorageKey());
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as UserProgress;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      journalEntries: normalizeJournalEntries(parsed.journalEntries ?? []),
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

function notify() {
  listeners.forEach((fn) => fn());
}

function persist(data: UserProgress, options?: { skipCloudSync?: boolean }) {
  const stamped: UserProgress = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  cache = stamped;
  try {
    localStorage.setItem(getActiveStorageKey(), JSON.stringify(stamped));
  } catch (err) {
    cache = loadRaw();
    const message =
      err instanceof DOMException && err.name === 'QuotaExceededError'
        ? messages.errors.storageFull
        : messages.errors.storage;
    throw new Error(message);
  }
  notify();
  if (!options?.skipCloudSync) {
    scheduleCloudSync();
  }
}

/** Restore progress from cloud without triggering an upload. */
export function persistFromCloud(data: UserProgress): void {
  const normalized: UserProgress = {
    ...DEFAULT_PROGRESS,
    ...data,
    journalEntries: normalizeJournalEntries(data.journalEntries ?? []),
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
  };
  cache = normalized;
  localStorage.setItem(getActiveStorageKey(), JSON.stringify(normalized));
  notify();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getProgress(): UserProgress {
  if (!cache) cache = loadRaw();
  return cache;
}

export function saveCheckIn(checkIn: CheckIn): void {
  const progress = getProgress();
  const filtered = progress.checkIns.filter((c) => c.date !== checkIn.date);
  persist({
    ...progress,
    checkIns: [...filtered, checkIn].sort((a, b) => a.date.localeCompare(b.date)),
  });
}

export function getCheckIn(date: string): CheckIn | undefined {
  return getProgress().checkIns.find((c) => c.date === date);
}

export function createJournalEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `journal-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function saveJournalEntry(entry: JournalEntry): void {
  const progress = getProgress();
  const filtered = progress.journalEntries.filter((e) => e.id !== entry.id);
  persist({
    ...progress,
    journalEntries: [...filtered, normalizeJournalEntry(entry)].sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
  });
}

export function deleteJournalEntry(id: string): void {
  const progress = getProgress();
  persist({
    ...progress,
    journalEntries: progress.journalEntries.filter((e) => e.id !== id),
  });
}

export function getJournalEntryByDate(date: string): JournalEntry | undefined {
  return getProgress().journalEntries.find((e) => e.date === date);
}

export function saveBadges(badges: Badge[]): void {
  const progress = getProgress();
  persist({ ...progress, badges });
}

export function saveSettings(settings: Partial<AppSettings>): void {
  const progress = getProgress();
  persist({
    ...progress,
    settings: { ...progress.settings, ...settings },
  });
}

export function resetProgress(): void {
  persist({ ...DEFAULT_PROGRESS });
}

export function exportJournal(): string {
  const { journalEntries } = getProgress();
  return JSON.stringify(journalEntries, null, 2);
}

export function importJournalBackup(json: string): void {
  const entries = normalizeJournalEntries(JSON.parse(json) as JournalEntry[]);
  const progress = getProgress();
  const byId = new Map(progress.journalEntries.map((e) => [e.id, e]));
  entries.forEach((e) => byId.set(e.id, e));
  persist({
    ...progress,
    journalEntries: Array.from(byId.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
  });
}

export function exportJournalMarkdown(): string {
  const { journalEntries } = getProgress();
  return journalEntries
    .map(
      (e) => `## ${e.date}

**Tags:** ${e.tags.length > 0 ? e.tags.join(', ') : 'None'}

**Prayer focus:** ${e.prayerFocus}

**What I prayed about:** ${e.prayedAbout}

**What God is teaching me:** ${e.godTeaching}

**Hunger / discipline notes:** ${e.hungerNotes}

**Victory today:** ${e.victory}

**Tomorrow's intention:** ${e.tomorrowIntention}
`,
    )
    .join('\n---\n\n');
}
