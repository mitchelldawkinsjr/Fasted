import type {
  AppSettings,
  Badge,
  CheckIn,
  GroupCheckIn,
  JournalEntry,
  Journey,
  MealSectionImages,
  UserProgress,
} from '../types';
import { FASTED_JOURNEY } from '../data/phaseTemplates';
import { normalizeJourney, normalizeJourneys } from './journey';
import { getDayMoodLabel } from './dayMood';
import { clampMealSectionImages, normalizeMealImagesRecord } from './mealImages';
import { FOOD_JOURNAL_FIELDS, FITNESS_JOURNAL_LABEL, journalEntryNeedsMigration, normalizeJournalEntries, normalizeJournalEntry } from './journalTags';
import { messages } from './messages';
import { scheduleCloudSync } from './sync';
import { computeCheckInStreak } from './streaks';

/** Legacy key — migrated to {@link GUEST_STORAGE_KEY} on first load. */
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
  checkInStreak: 0,
  journalEntries: [],
  mealImages: {},
  badges: [],
  settings: DEFAULT_SETTINGS,
  activeJourneyId: FASTED_JOURNEY.id,
  journeys: [FASTED_JOURNEY],
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

function loadRaw(): UserProgress {
  try {
    const raw = localStorage.getItem(getActiveStorageKey());
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as UserProgress;
    const journalEntries = normalizeJournalEntries(parsed.journalEntries ?? []);
    const { journeys, activeJourneyId } = normalizeJourneys(parsed.journeys, parsed.activeJourneyId);
    const { record: mealImages, changed: mealImagesChanged } = normalizeMealImagesRecord(
      parsed.mealImages ?? {},
    );
    const progress: UserProgress = {
      ...DEFAULT_PROGRESS,
      ...parsed,
      checkInStreak: parsed.checkInStreak ?? 0,
      journalEntries,
      mealImages,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      journeys,
      activeJourneyId,
    };

    const needsJournalMigration = (parsed.journalEntries ?? []).some(journalEntryNeedsMigration);
    if (needsJournalMigration || mealImagesChanged) {
      try {
        localStorage.setItem(
          getActiveStorageKey(),
          JSON.stringify({
            ...progress,
            updatedAt: progress.updatedAt ?? new Date().toISOString(),
          }),
        );
      } catch {
        // Keep serving normalized in-memory data even if rewrite fails.
      }
    }

    return progress;
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
  const { journeys, activeJourneyId } = normalizeJourneys(data.journeys, data.activeJourneyId);
  const { record: mealImages } = normalizeMealImagesRecord(data.mealImages ?? {});
  const normalized: UserProgress = {
    ...DEFAULT_PROGRESS,
    ...data,
    checkInStreak: data.checkInStreak ?? 0,
    journalEntries: normalizeJournalEntries(data.journalEntries ?? []),
    mealImages,
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
    journeys,
    activeJourneyId,
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
  saveCheckInWithGroupCheckIns(checkIn, []);
}

export function saveCheckInWithGroupCheckIns(
  checkIn: CheckIn,
  groupCheckIns: ReadonlyArray<{ groupId: string; checkIn: GroupCheckIn }>,
): void {
  const progress = getProgress();
  const filtered = progress.checkIns.filter((c) => c.date !== checkIn.date);
  const checkIns = [...filtered, checkIn].sort((a, b) => a.date.localeCompare(b.date));

  let nextGroupCheckIns = progress.groupCheckIns ?? {};
  for (const { groupId, checkIn: groupCheckIn } of groupCheckIns) {
    const existing = nextGroupCheckIns[groupId] ?? [];
    const filteredGroup = existing.filter((c) => c.date !== groupCheckIn.date);
    nextGroupCheckIns = {
      ...nextGroupCheckIns,
      [groupId]: [...filteredGroup, groupCheckIn].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    };
  }

  persist({
    ...progress,
    checkIns,
    checkInStreak: computeCheckInStreak(checkIns, checkIn.date),
    groupCheckIns: nextGroupCheckIns,
  });
}

export function getCheckIn(date: string): CheckIn | undefined {
  return getProgress().checkIns.find((c) => c.date === date);
}

export function saveGroupCheckIn(groupId: string, checkIn: GroupCheckIn): void {
  const progress = getProgress();
  const existing = progress.groupCheckIns?.[groupId] ?? [];
  const filtered = existing.filter((c) => c.date !== checkIn.date);
  const records = [...filtered, checkIn].sort((a, b) => a.date.localeCompare(b.date));

  persist({
    ...progress,
    groupCheckIns: {
      ...progress.groupCheckIns,
      [groupId]: records,
    },
  });
}

export function getGroupCheckIn(groupId: string, date: string): GroupCheckIn | undefined {
  return getProgress().groupCheckIns?.[groupId]?.find((c) => c.date === date);
}

export function createJournalEntryId(): string {
  return crypto.randomUUID();
}

export function saveJournalEntry(entry: JournalEntry): void {
  saveJournalEntryWithMealImages(entry);
}

export function saveJournalEntryWithMealImages(
  entry: JournalEntry,
  images?: MealSectionImages,
): void {
  const progress = getProgress();
  const filtered = progress.journalEntries.filter((e) => e.id !== entry.id);
  const nextMealImages = { ...progress.mealImages };

  if (images) {
    const hasImages = Object.values(images).some((section) => section && section.length > 0);
    if (hasImages) {
      nextMealImages[entry.id] = images;
    } else {
      delete nextMealImages[entry.id];
    }
  }

  persist({
    ...progress,
    journalEntries: [...filtered, normalizeJournalEntry(entry)].sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
    mealImages: nextMealImages,
  });
}

export function deleteJournalEntry(id: string): void {
  const progress = getProgress();
  const { [id]: _removed, ...remainingMealImages } = progress.mealImages;
  persist({
    ...progress,
    journalEntries: progress.journalEntries.filter((e) => e.id !== id),
    mealImages: remainingMealImages,
  });
}

export function getMealImages(entryId: string): MealSectionImages {
  const stored = getProgress().mealImages[entryId];
  return stored ? clampMealSectionImages(stored).images : {};
}

export function saveMealImages(entryId: string, images: MealSectionImages): void {
  const progress = getProgress();
  const hasImages = Object.values(images).some((section) => section && section.length > 0);
  const nextMealImages = { ...progress.mealImages };

  if (hasImages) {
    nextMealImages[entryId] = images;
  } else {
    delete nextMealImages[entryId];
  }

  persist({
    ...progress,
    mealImages: nextMealImages,
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

export function saveJourney(journey: Journey): void {
  const progress = getProgress();
  const normalizedJourney = normalizeJourney(journey);
  const existing = progress.journeys.findIndex((j) => j.id === journey.id);
  const journeys =
    existing >= 0
      ? progress.journeys.map((j, i) => (i === existing ? normalizedJourney : j))
      : [...progress.journeys, normalizedJourney];
  persist({ ...progress, journeys });
}

export function setActiveJourney(id: string): void {
  const progress = getProgress();
  if (!progress.journeys.some((j) => j.id === id)) {
    throw new Error('Journey not found');
  }
  persist({ ...progress, activeJourneyId: id });
}

export function updateFastedJourneyStartDate(startDate: string): void {
  const progress = getProgress();
  const journeys = progress.journeys.map((j) =>
    j.id === FASTED_JOURNEY.id ? { ...j, startDate } : j,
  );
  persist({ ...progress, journeys });
}

export function resetProgress(): void {
  persist({ ...DEFAULT_PROGRESS });
}

type JournalBackup = {
  journalEntries: JournalEntry[];
  mealImages?: Record<string, MealSectionImages>;
};

function parseJournalBackup(json: string): JournalBackup {
  const parsed = JSON.parse(json) as unknown;
  if (Array.isArray(parsed)) {
    return { journalEntries: normalizeJournalEntries(parsed) };
  }
  if (parsed && typeof parsed === 'object' && 'journalEntries' in parsed) {
    const backup = parsed as { journalEntries?: unknown; mealImages?: Record<string, MealSectionImages> };
    return {
      journalEntries: normalizeJournalEntries(
        Array.isArray(backup.journalEntries) ? backup.journalEntries : [],
      ),
      mealImages: backup.mealImages,
    };
  }
  throw new Error('Invalid journal backup format.');
}

export function exportJournal(): string {
  const { journalEntries, mealImages } = getProgress();
  return JSON.stringify({ journalEntries, mealImages }, null, 2);
}

export function importJournalBackup(json: string): { mealImagesTruncated: boolean } {
  const { journalEntries: entries, mealImages } = parseJournalBackup(json);
  const progress = getProgress();
  const byId = new Map(progress.journalEntries.map((e) => [e.id, e]));
  entries.forEach((e) => byId.set(e.id, e));

  let mealImagesTruncated = false;
  let mergedMealImages = progress.mealImages;
  if (mealImages) {
    const { record: normalizedImport, changed } = normalizeMealImagesRecord(mealImages);
    mealImagesTruncated = changed;
    mergedMealImages = { ...progress.mealImages, ...normalizedImport };
  }

  persist({
    ...progress,
    journalEntries: Array.from(byId.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
    mealImages: mergedMealImages,
  });

  return { mealImagesTruncated };
}

export function exportJournalMarkdown(): string {
  const { journalEntries } = getProgress();
  return journalEntries
    .map((e) => {
      if (e.type === 'daily-reflection') {
        return `## ${e.date}

**Type:** Daily Reflection
${e.dayMood ? `\n**Mood:** ${getDayMoodLabel(e.dayMood)}\n` : ''}
**Verse of the Day:** ${e.prayerFocus}

**What I prayed about:** ${e.prayedAbout}

**What God is teaching me:** ${e.godTeaching}

**Hunger / discipline notes:** ${e.hungerNotes}

**Victory today:** ${e.victory}

**Tomorrow's intention:** ${e.tomorrowIntention}
`;
      }

      if (e.type === 'food') {
        const sections = FOOD_JOURNAL_FIELDS.map(
          ({ key, label }) => e[key].trim() && `**${label}** ${e[key]}`,
        ).filter(Boolean);

        return `## ${e.date}

**Type:** Food

${sections.join('\n\n')}
`;
      }

      if (e.type === 'fitness') {
        return `## ${e.date}

**Type:** Fitness

**${FITNESS_JOURNAL_LABEL}** ${e.content}
`;
      }

      const label = e.type.charAt(0).toUpperCase() + e.type.slice(1);
      return `## ${e.date}

**Type:** ${label}

${e.content}
`;
    })
    .join('\n---\n\n');
}
