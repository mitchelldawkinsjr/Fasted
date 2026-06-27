export type FastType =
  | 'normal-eating'
  | 'sunrise-to-sunset-water'
  | 'sunrise-to-sunset-with-coffee-tea'
  | 'daniel-fast'
  | 'twenty-four-hour-water'
  | 'extended-prayer';

export type SchedulePattern =
  | { kind: 'weekday-fast'; fastDays: number[]; fastType: FastType }
  | { kind: 'consecutive-daniel'; includesWalk?: boolean }
  | {
      kind: 'rotating-weekly';
      weeks: Array<{ weekIndex: number; dayOfWeek: number; fastType: FastType }>;
    }
  | {
      kind: 'weekday-with-prayer';
      fastDays: number[];
      fastType: FastType;
      prayerDays: number[];
    };

export type FastPhaseTemplate = {
  id: string;
  legacyId: number;
  title: string;
  durationDays: number;
  themeColor: string;
  scriptureReference: string;
  scriptureTextNLT: string;
  scheduleSummary: string;
  schedulePattern: SchedulePattern;
  allowed?: string[];
  avoid?: string[];
  dailyReadings?: string[];
  prayerFocus: string[];
  imagePath: string;
  safetyNote?: string;
};

export type JourneyPhase = { templateId: string; order: number };

export type Journey = {
  id: string;
  name: string;
  startDate: string;
  phases: JourneyPhase[];
  isDefault?: boolean;
  locked?: boolean;
};

/** Date-bound phase view (computed from a journey). */
export type FastPhase = {
  id: number;
  templateId: string;
  title: string;
  startDate: string;
  endDate: string;
  themeColor: string;
  scriptureReference: string;
  scriptureTextNLT: string;
  scheduleSummary: string;
  allowed?: string[];
  avoid?: string[];
  dailyReadings?: string[];
  prayerFocus: string[];
  imagePath: string;
  safetyNote?: string;
};

export type DailyFastPlan = {
  date: string;
  phaseId: number;
  isFastDay: boolean;
  fastType: FastType;
  instructions: string[];
  scriptureReferences: string[];
  prayerPoints: string[];
  encouragement: string;
  checkInPrompts: string[];
};

export type CheckIn = {
  date: string;
  followedPlan: boolean;
  prayedFocus: boolean;
  readScripture: boolean;
  journaled: boolean;
  win: string;
  completedAt: string;
};

/** Five-point daily mood scale for Daily Reflection entries. */
export type DayMood = 'amazing' | 'good' | 'okay' | 'bad' | 'horrible';

export type SimpleJournalType = 'prayer' | 'gratitude' | 'victory';

export type JournalEntryType = 'daily-reflection' | SimpleJournalType;

type JournalEntryBase = {
  id: string;
  date: string;
  updatedAt: string;
};

export type DailyReflectionEntry = JournalEntryBase & {
  type: 'daily-reflection';
  /** How the day felt — required for new daily reflections. */
  dayMood?: DayMood | null;
  prayerFocus: string;
  prayedAbout: string;
  godTeaching: string;
  hungerNotes: string;
  victory: string;
  tomorrowIntention: string;
};

export type SimpleJournalEntry = JournalEntryBase & {
  type: SimpleJournalType;
  content: string;
};

export type JournalEntry = DailyReflectionEntry | SimpleJournalEntry;

export type AppSettings = {
  reminderTime: string;
  theme: 'light' | 'dark' | 'system';
  scriptureNote: string;
};

export type BadgeId = string;

export type Badge = {
  id: BadgeId;
  title: string;
  description: string;
  earnedAt?: string;
  phaseId?: number;
};

export type UserProgress = {
  checkIns: CheckIn[];
  journalEntries: JournalEntry[];
  badges: Badge[];
  settings: AppSettings;
  activeJourneyId: string;
  journeys: Journey[];
  /** ISO timestamp — used to reconcile local vs cloud copies when signed in. */
  updatedAt?: string;
};
