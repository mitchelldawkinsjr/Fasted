import type {
  AppSettings,
  Badge,
  CheckIn,
  FoodMealKey,
  GroupCheckIn,
  JournalEntry,
  Journey,
  MealSectionImages,
  UserProgress,
} from '../types';
import { FASTED_JOURNEY } from '../data/phaseTemplates';
import { normalizeJourney, normalizeJourneys } from './journey';
import { getDayMoodLabel } from './dayMood';
import {
  blobToDataUrl,
  clearScope,
  dataUrlToBlob,
  deleteImages,
  imageScopeKey,
  invalidateMealImageSrcs,
  isDataUrl,
  putImage,
} from './imageStore';
import { FOOD_JOURNAL_FIELDS, FITNESS_JOURNAL_LABEL, journalEntryNeedsMigration, normalizeJournalEntries, normalizeJournalEntry } from './journalTags';
import { collectMealImageIds } from './mealImages';
import { deleteRemoteImages, resolveMealImageBlob } from './mealImageSync';
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
const migrationInFlight = new Map<string, Promise<void>>();

function getActiveStorageKey(): string {
  return currentScope ? userStorageKey(currentScope) : GUEST_STORAGE_KEY;
}

export function getStorageScope(): string | null {
  return currentScope;
}

function getImageScope(): string {
  return imageScopeKey(currentScope);
}

function mealImagesNeedMigration(mealImages: Record<string, MealSectionImages>): boolean {
  return Object.values(mealImages).some((sections) =>
    Object.values(sections).some((ids) => ids?.some(isDataUrl)),
  );
}

async function migrateBase64MealImages(
  mealImages: Record<string, MealSectionImages>,
  scope: string,
): Promise<Record<string, MealSectionImages>> {
  const next: Record<string, MealSectionImages> = {};

  for (const [entryId, sections] of Object.entries(mealImages)) {
    const migratedSections: MealSectionImages = {};
    for (const [mealKey, values] of Object.entries(sections) as Array<
      [FoodMealKey, string[] | undefined]
    >) {
      if (!values || values.length === 0) continue;
      const ids: string[] = [];
      for (const value of values) {
        if (isDataUrl(value)) {
          const blob = await dataUrlToBlob(value);
          const id = crypto.randomUUID();
          await putImage(scope, id, blob, { synced: false });
          ids.push(id);
        } else {
          ids.push(value);
        }
      }
      migratedSections[mealKey] = ids;
    }
    if (Object.keys(migratedSections).length > 0) {
      next[entryId] = migratedSections;
    }
  }

  return next;
}

/** Convert legacy base64 mealImages in the active scope into IndexedDB blobs + IDs. */
export async function ensureMealImageMigration(): Promise<void> {
  const scope = getImageScope();
  const existing = migrationInFlight.get(scope);
  if (existing) return existing;

  const run = (async () => {
    const progress = getProgress();
    if (!mealImagesNeedMigration(progress.mealImages)) return;

    const mealImages = await migrateBase64MealImages(progress.mealImages, scope);
    persist(
      {
        ...progress,
        mealImages,
      },
      { skipCloudSync: true },
    );
  })().finally(() => {
    migrationInFlight.delete(scope);
  });

  migrationInFlight.set(scope, run);
  return run;
}

async function removeMealImageBlobs(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const scope = getImageScope();
  invalidateMealImageSrcs(scope, ids);
  await deleteImages(scope, ids);
  if (currentScope) {
    try {
      await deleteRemoteImages(currentScope, ids);
    } catch {
      // Local delete already applied; remote cleanup can retry later.
    }
  }
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
  void ensureMealImageMigration();
}

function loadRaw(): UserProgress {
  try {
    const raw = localStorage.getItem(getActiveStorageKey());
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as UserProgress;
    const journalEntries = normalizeJournalEntries(parsed.journalEntries ?? []);
    const { journeys, activeJourneyId } = normalizeJourneys(parsed.journeys, parsed.activeJourneyId);
    const progress: UserProgress = {
      ...DEFAULT_PROGRESS,
      ...parsed,
      checkInStreak: parsed.checkInStreak ?? 0,
      journalEntries,
      mealImages: parsed.mealImages ?? {},
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      journeys,
      activeJourneyId,
    };

    const needsJournalMigration = (parsed.journalEntries ?? []).some(journalEntryNeedsMigration);
    if (needsJournalMigration) {
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
  const normalized: UserProgress = {
    ...DEFAULT_PROGRESS,
    ...data,
    checkInStreak: data.checkInStreak ?? 0,
    journalEntries: normalizeJournalEntries(data.journalEntries ?? []),
    mealImages: data.mealImages ?? {},
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
    journeys,
    activeJourneyId,
  };
  cache = normalized;
  localStorage.setItem(getActiveStorageKey(), JSON.stringify(normalized));
  notify();
  void ensureMealImageMigration();
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
  let removedIds: string[] = [];

  if (images) {
    const previousIds = collectMealImageIds(progress.mealImages[entry.id]);
    const nextIds = new Set(collectMealImageIds(images));
    removedIds = previousIds.filter((id) => !nextIds.has(id));

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

  void removeMealImageBlobs(removedIds);
}

export function deleteJournalEntry(id: string): void {
  const progress = getProgress();
  const removedIds = collectMealImageIds(progress.mealImages[id]);
  const { [id]: _removed, ...remainingMealImages } = progress.mealImages;
  persist({
    ...progress,
    journalEntries: progress.journalEntries.filter((e) => e.id !== id),
    mealImages: remainingMealImages,
  });
  void removeMealImageBlobs(removedIds);
}

export function getMealImages(entryId: string): MealSectionImages {
  return getProgress().mealImages[entryId] ?? {};
}

export function saveMealImages(entryId: string, images: MealSectionImages): void {
  const progress = getProgress();
  const previousIds = collectMealImageIds(progress.mealImages[entryId]);
  const nextIds = new Set(collectMealImageIds(images));
  const removedIds = previousIds.filter((id) => !nextIds.has(id));

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
  void removeMealImageBlobs(removedIds);
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

const LEGACY_TOUR_KEY = 'fasted-tour-v1';

/** Migrate the pre-v1 localStorage tour flag into {@link UserProgress}. */
export function migrateLegacyTourFlag(): void {
  if (localStorage.getItem(LEGACY_TOUR_KEY) !== 'done') return;
  localStorage.removeItem(LEGACY_TOUR_KEY);
  markTourSeen();
}

export function markTourSeen(): void {
  const progress = getProgress();
  if (progress.hasSeenTour) return;
  persist({ ...progress, hasSeenTour: true });
}

export function markPageTourSeen(pageId: 'settings' | 'calendar' | 'progress' | 'groups'): void {
  const progress = getProgress();
  if (progress.pageToursSeen?.[pageId]) return;
  persist({
    ...progress,
    pageToursSeen: { ...progress.pageToursSeen, [pageId]: true },
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
  const scope = getImageScope();
  const allIds = Object.values(getProgress().mealImages).flatMap((sections) =>
    collectMealImageIds(sections),
  );
  persist({ ...DEFAULT_PROGRESS });
  void (async () => {
    invalidateMealImageSrcs(scope, allIds);
    await clearScope(scope);
    if (currentScope) {
      try {
        await deleteRemoteImages(currentScope, allIds);
      } catch {
        // Local reset already applied.
      }
    }
  })();
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

/** Export journals with meal photos embedded as data URLs for portability. */
export async function exportJournal(): Promise<string> {
  const { journalEntries, mealImages } = getProgress();
  const scope = getImageScope();
  const exportedMealImages: Record<string, MealSectionImages> = {};

  for (const [entryId, sections] of Object.entries(mealImages)) {
    const exportedSections: MealSectionImages = {};
    for (const [mealKey, values] of Object.entries(sections) as Array<
      [FoodMealKey, string[] | undefined]
    >) {
      if (!values || values.length === 0) continue;
      const dataUrls: string[] = [];
      for (const value of values) {
        if (isDataUrl(value)) {
          dataUrls.push(value);
          continue;
        }
        const blob = await resolveMealImageBlob(scope, value);
        if (blob) {
          dataUrls.push(await blobToDataUrl(blob));
        }
      }
      if (dataUrls.length > 0) {
        exportedSections[mealKey] = dataUrls;
      }
    }
    if (Object.keys(exportedSections).length > 0) {
      exportedMealImages[entryId] = exportedSections;
    }
  }

  return JSON.stringify({ journalEntries, mealImages: exportedMealImages }, null, 2);
}

/** Import journals; data-URL meal photos are stored in IndexedDB and referenced by ID. */
export async function importJournalBackup(json: string): Promise<void> {
  const { journalEntries: entries, mealImages } = parseJournalBackup(json);
  const progress = getProgress();
  const byId = new Map(progress.journalEntries.map((e) => [e.id, e]));
  entries.forEach((e) => byId.set(e.id, e));

  let nextMealImages = progress.mealImages;
  const removedIds: string[] = [];
  if (mealImages) {
    const scope = getImageScope();
    const imported = await migrateBase64MealImages(mealImages, scope);
    for (const [entryId, sections] of Object.entries(imported)) {
      const previousIds = collectMealImageIds(progress.mealImages[entryId]);
      const nextIds = new Set(collectMealImageIds(sections));
      removedIds.push(...previousIds.filter((id) => !nextIds.has(id)));
    }
    nextMealImages = { ...progress.mealImages, ...imported };
  }

  persist({
    ...progress,
    journalEntries: Array.from(byId.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
    mealImages: nextMealImages,
  });
  void removeMealImageBlobs(removedIds);
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
