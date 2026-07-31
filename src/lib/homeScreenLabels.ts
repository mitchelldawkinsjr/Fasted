import type {
  ArrivalMood,
  CommitmentLevel,
  DailyChallenge,
  DailyIntention,
  FastType,
} from '../types';

export const ARRIVAL_MOOD_OPTIONS: { value: ArrivalMood; label: string; emoji: string }[] = [
  { value: 'excited', label: 'Excited', emoji: '😊' },
  { value: 'peaceful', label: 'Peaceful', emoji: '🙂' },
  { value: 'okay', label: 'Okay', emoji: '😐' },
  { value: 'struggling', label: 'Struggling', emoji: '😔' },
  { value: 'exhausted', label: 'Exhausted', emoji: '😩' },
];

export const COMMITMENT_OPTIONS: { value: CommitmentLevel; label: string; emoji: string }[] = [
  { value: 'fully-committed', label: 'Fully committed', emoji: '🔥' },
  { value: 'do-my-best', label: "I'll do my best", emoji: '🙂' },
  { value: 'worried', label: "I'm worried I'll struggle", emoji: '😬' },
];

export const CHALLENGE_OPTIONS: { value: DailyChallenge; label: string }[] = [
  { value: 'hungry', label: 'Hungry' },
  { value: 'busy', label: 'Busy schedule' },
  { value: 'stress', label: 'Stress' },
  { value: 'temptation', label: 'Temptation' },
  { value: 'energy', label: 'Energy' },
  { value: 'distractions', label: 'Distractions' },
  { value: 'other', label: 'Other' },
];

export const INTENTION_OPTIONS: { value: DailyIntention; label: string }[] = [
  { value: 'grow-closer', label: 'Grow closer to God' },
  { value: 'seek-healing', label: 'Seek healing' },
  { value: 'practice-discipline', label: 'Practice discipline' },
  { value: 'pray-for-someone', label: 'Pray for someone' },
  { value: 'break-habits', label: 'Break unhealthy habits' },
  { value: 'hear-god', label: "Hear God's voice" },
  { value: 'other', label: 'Other' },
];

export const FAST_TYPE_LABELS: Record<FastType, string> = {
  'normal-eating': 'Preparation / Normal Eating Day',
  'sunrise-to-sunset-water': 'Sunrise → Sunset · Water Only',
  'sunrise-to-sunset-with-coffee-tea': 'Sunrise → Sunset · Water, Coffee & Tea',
  'daniel-fast': 'Daniel Fast Day',
  'twenty-four-hour-water': '24-Hour Water Fast',
  'extended-prayer': 'Extended Prayer Day',
};

export const FAST_SCHEDULE_LABELS: Record<FastType, string> = {
  'normal-eating': 'Normal eating day',
  'sunrise-to-sunset-water': 'Sunrise → Sunset',
  'sunrise-to-sunset-with-coffee-tea': 'Sunrise → Sunset',
  'daniel-fast': 'Daniel Fast',
  'twenty-four-hour-water': '24-Hour Fast',
  'extended-prayer': 'Extended Prayer',
};

export function getTimeGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/** Keep encouragement concise for the home screen hero area. */
export function conciseEncouragement(message: string, maxSentences = 2): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;
  const sentences = trimmed.match(/[^.!?]+[.!?]+/g) ?? [trimmed];
  if (sentences.length <= maxSentences) return trimmed;
  return sentences.slice(0, maxSentences).join(' ').trim();
}
