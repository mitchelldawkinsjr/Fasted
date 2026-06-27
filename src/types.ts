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

export type ContentSimpleJournalType = 'prayer' | 'gratitude' | 'victory';

export type SimpleJournalType = ContentSimpleJournalType | 'food' | 'fitness';

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

export type ContentSimpleJournalEntry = JournalEntryBase & {
  type: ContentSimpleJournalType;
  content: string;
};

export type FoodJournalEntry = JournalEntryBase & {
  type: 'food';
  breakfast: string;
  lunch: string;
  dinner: string;
  snack: string;
};

export type FitnessJournalEntry = JournalEntryBase & {
  type: 'fitness';
  movement: string;
};

export type SimpleJournalEntry =
  | ContentSimpleJournalEntry
  | FoodJournalEntry
  | FitnessJournalEntry;

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
  /** Consecutive check-in days after the most recent successful check-in. */
  checkInStreak: number;
  journalEntries: JournalEntry[];
  badges: Badge[];
  settings: AppSettings;
  activeJourneyId: string;
  journeys: Journey[];
  /** ISO timestamp — used to reconcile local vs cloud copies when signed in. */
  updatedAt?: string;
};

export type GroupPrivacy = 'anonymous' | 'named';

export type GroupJourneyType = 'built-in' | 'custom';

/** Cloud-stored journey config for a group (Supabase `journeys` table). */
export type GroupJourneyRecord = {
  id: string;
  type: GroupJourneyType;
  name: string;
  start_date: string | null;
  phases: JourneyPhase[] | null;
  created_by: string | null;
  created_at: string;
};

export type GroupRecord = {
  id: string;
  org_id: string | null;
  journey_id: string;
  name: string;
  invite_code: string;
  privacy: GroupPrivacy;
  created_by: string | null;
  created_at: string;
  journey?: GroupJourneyRecord;
};

export type GroupMembership = {
  id: string;
  group_id: string;
  user_id: string;
  role: 'leader' | 'member';
  display_name: string | null;
  joined_at: string;
};

export type SharedJournalEntry = {
  id: string;
  group_id: string;
  user_id: string;
  content: Record<string, unknown>;
  phase_id: number | null;
  shared_at: string;
};

export type PrayerRequest = {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  pinned: boolean;
  created_at: string;
};

export type GroupCheckinStats = {
  group_id: string;
  member_count: number;
  total_checkins: number;
  avg_checkins_per_member: number | null;
};

export type MemberProgressSummary = {
  user_id: string;
  display_name: string | null;
  check_in_count: number;
  journal_count: number;
  last_check_in: string | null;
};

export type CreateGroupInput = {
  name: string;
  privacy: GroupPrivacy;
  journeyType: GroupJourneyType;
  customJourney?: Pick<Journey, 'name' | 'startDate' | 'phases'>;
  displayName?: string;
};
