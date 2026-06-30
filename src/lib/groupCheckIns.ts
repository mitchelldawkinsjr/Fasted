import type {
  CommitmentDefinition,
  CommitmentResult,
  GroupCheckIn,
  MemberCommitmentStatus,
} from '../types';
import { addLocalDays, daysBetween, getLocalDateString } from './dateUtils';

export function commitmentValueMet(
  definition: CommitmentDefinition,
  value: CommitmentResult['value'] | undefined,
): boolean {
  if (definition.shape === 'duration') {
    const minutes = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(minutes)) return false;
    return definition.target == null || minutes >= definition.target;
  }
  if (definition.shape === 'text_note') {
    return typeof value === 'string' && value.trim().length > 0;
  }
  return false;
}

export function computeCommitmentHonored(
  definition: CommitmentDefinition,
  result: Pick<CommitmentResult, 'honored' | 'value'> | undefined,
): boolean {
  if (definition.shape === 'yes_no') {
    return Boolean(result?.honored);
  }
  return commitmentValueMet(definition, result?.value);
}

export function isCommitmentHonored(
  definition: CommitmentDefinition,
  result: CommitmentResult | undefined,
): boolean {
  if (!result?.honored) return false;
  if (definition.shape === 'yes_no') return true;
  return commitmentValueMet(definition, result.value);
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
  records: GroupCheckIn[] | undefined,
  date: string,
): GroupCheckIn | undefined {
  return records?.find((r) => r.date === date);
}

function dayHonored(
  byDate: Map<string, GroupCheckIn>,
  definitions: CommitmentDefinition[],
  date: string,
): boolean {
  const record = byDate.get(date);
  return Boolean(record && allCommitmentsHonored(definitions, record.results));
}

export function computeGroupCheckInStreak(
  records: GroupCheckIn[] | undefined,
  definitions: CommitmentDefinition[],
  today = getLocalDateString(),
): number {
  if (!records?.length || definitions.length === 0) return 0;

  const byDate = new Map(records.map((r) => [r.date, r]));
  let cursor = today;

  if (!dayHonored(byDate, definitions, cursor)) {
    cursor = addLocalDays(cursor, -1);
  }

  let streak = 0;
  while (dayHonored(byDate, definitions, cursor)) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }

  return streak;
}

export function computeGroupCompletionStats(
  records: GroupCheckIn[] | undefined,
  definitions: CommitmentDefinition[],
  journeyStart: string,
  today = getLocalDateString(),
): { completionRate: number; daysMissed: number; daysElapsed: number } {
  if (today < journeyStart) {
    return { completionRate: 0, daysMissed: 0, daysElapsed: 0 };
  }

  const daysElapsed = daysBetween(journeyStart, today);
  const dates = Array.from({ length: daysElapsed }, (_, index) =>
    addLocalDays(journeyStart, index),
  );

  const completed = dates.filter((date) => {
    const record = getGroupCheckInForDate(records, date);
    return record && allCommitmentsHonored(definitions, record.results);
  }).length;

  const daysMissed = Math.max(0, daysElapsed - completed);
  const completionRate = daysElapsed > 0 ? Math.round((completed / daysElapsed) * 100) : 0;

  return { completionRate, daysMissed, daysElapsed };
}

export function buildTodayCommitmentStatus(
  definitions: CommitmentDefinition[],
  results: CommitmentResult[] | undefined,
): MemberCommitmentStatus[] {
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
