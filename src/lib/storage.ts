import type {
  AppSettings,
  Badge,
  CheckIn,
  JournalEntry,
  UserProgress,
} from '../types';
import { scheduleCloudSync } from './sync';

const STORAGE_KEY = 'fasted-calendar-progress';

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

function loadRaw(): UserProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as UserProgress;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

let cache: UserProgress | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

function persist(data: UserProgress, options?: { skipCloudSync?: boolean }) {
  cache = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  notify();
  if (!options?.skipCloudSync) {
    scheduleCloudSync();
  }
}

/** Restore progress from cloud without triggering an upload. */
export function persistFromCloud(data: UserProgress): void {
  persist(
    {
      ...DEFAULT_PROGRESS,
      ...data,
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
    },
    { skipCloudSync: true },
  );
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
    journalEntries: [...filtered, entry].sort((a, b) => b.date.localeCompare(a.date)),
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
  const entries = JSON.parse(json) as JournalEntry[];
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
