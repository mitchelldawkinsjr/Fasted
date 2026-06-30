import type {
  CommitmentDefinition,
  CommitmentResult,
  GroupCheckIn,
  GroupCheckInRecord,
} from '../types';
import { getLocalDateString } from './dateUtils';

export function isCommitmentHonored(
  definition: CommitmentDefinition,
  result: CommitmentResult | undefined,
): boolean {
  if (!result?.honored) return false;
  if (definition.shape === 'duration' && definition.target != null) {
    const minutes = typeof result.value === 'number' ? result.value : Number(result.value);
    return Number.isFinite(minutes) && minutes >= definition.target;
  }
  if (definition.shape === 'count' && definition.target != null) {
    const count = typeof result.value === 'number' ? result.value : Number(result.value);
    return Number.isFinite(count) && count >= definition.target;
  }
  if (definition.shape === 'text_note') {
    return typeof result.value === 'string' && result.value.trim().length > 0;
  }
  return true;
}

export function allCommitmentsHonored(
  definitions: CommitmentDefinition[],
  results: CommitmentResult[],
): boolean {
  if (definitions.length === 0) return false;
  const byId = new Map(results.map((r) => [r.commitmentId, r]));
  return definitions.every((def) => isCommitmentHonored(def, byId.get(def.id)));
}

export function getGroupCheckInForDate(
  records: GroupCheckInRecord[] | undefined,
  date: string,
): GroupCheckIn | undefined {
  return records?.find((r) => r.date === date);
}

function previousDay(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function dayHonored(
  byDate: Map<string, GroupCheckInRecord>,
  definitions: CommitmentDefinition[],
  date: string,
): boolean {
  const record = byDate.get(date);
  return Boolean(record && allCommitmentsHonored(definitions, record.results));
}

export function computeGroupCheckInStreak(
  records: GroupCheckInRecord[] | undefined,
  definitions: CommitmentDefinition[],
  today = getLocalDateString(),
): number {
  if (!records?.length || definitions.length === 0) return 0;

  const byDate = new Map(records.map((r) => [r.date, r]));
  let cursor = today;

  if (!dayHonored(byDate, definitions, cursor)) {
    cursor = previousDay(cursor);
  }

  let streak = 0;
  while (dayHonored(byDate, definitions, cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }

  return streak;
}

export function computeGroupCompletionStats(
  records: GroupCheckInRecord[] | undefined,
  definitions: CommitmentDefinition[],
  journeyStart: string,
  today = getLocalDateString(),
): { completionRate: number; daysMissed: number; daysElapsed: number } {
  if (today < journeyStart) {
    return { completionRate: 0, daysMissed: 0, daysElapsed: 0 };
  }

  const end = today;
  const dates: string[] = [];
  const cursor = new Date(`${journeyStart}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);

  while (cursor <= endDate) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  const completed = dates.filter((date) => {
    const record = getGroupCheckInForDate(records, date);
    return record && allCommitmentsHonored(definitions, record.results);
  }).length;

  const daysElapsed = dates.length;
  const daysMissed = Math.max(0, daysElapsed - completed);
  const completionRate = daysElapsed > 0 ? Math.round((completed / daysElapsed) * 100) : 0;

  return { completionRate, daysMissed, daysElapsed };
}

export function buildTodayCommitmentStatus(
  definitions: CommitmentDefinition[],
  results: CommitmentResult[] | undefined,
): Array<{ commitmentId: string; label: string; honored: boolean; value?: number | string }> {
  const byId = new Map((results ?? []).map((r) => [r.commitmentId, r]));
  return definitions.map((def) => {
    const result = byId.get(def.id);
    return {
      commitmentId: def.id,
      label: def.label,
      honored: isCommitmentHonored(def, result),
      value: result?.value,
    };
  });
}
