import type { JournalTag } from '../types';

export const JOURNAL_TAGS: JournalTag[] = ['prayer', 'gratitude', 'victory'];

export const JOURNAL_TAG_LABELS: Record<JournalTag, string> = {
  prayer: 'Prayer',
  gratitude: 'Gratitude',
  victory: 'Victory',
};

export function isJournalTag(value: string): value is JournalTag {
  return JOURNAL_TAGS.includes(value as JournalTag);
}

export function normalizeJournalTags(tags: unknown): JournalTag[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag): tag is JournalTag => typeof tag === 'string' && isJournalTag(tag));
}

export function journalTagFromTodayLabel(label: string): JournalTag | null {
  const normalized = label.trim().toLowerCase();
  if (normalized === 'gratitude') return 'gratitude';
  return null;
}
