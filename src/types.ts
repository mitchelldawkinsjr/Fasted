export type FastType =
  | 'normal-eating'
  | 'sunrise-to-sunset-water'
  | 'sunrise-to-sunset-with-coffee-tea'
  | 'daniel-fast'
  | 'twenty-four-hour-water'
  | 'extended-prayer';

export type FastPhase = {
  id: number;
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

/** Five-point daily mood scale for Morning Devotion entries. */
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
  /** How the morning feels — required for new morning devotions. */
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
  /** ISO timestamp — used to reconcile local vs cloud copies when signed in. */
  updatedAt?: string;
};
