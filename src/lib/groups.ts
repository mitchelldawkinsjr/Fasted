import { FASTED_JOURNEY } from '../data/phaseTemplates';
import { createCommitmentPreset } from '../data/commitmentPresets';
import {
  allCommitmentsHonored,
  buildTodayCommitmentStatus,
  computeGroupCheckInStreak,
  computeGroupCompletionStats,
  getGroupCheckInForDate,
} from './groupCheckIns';
import type {
  CommitmentDefinition,
  CreateGroupInput,
  GroupCheckinStats,
  GroupMembership,
  GroupRecord,
  MemberCovenant,
  MemberProgressSummary,
  PrayerRequest,
  SharedJournalEntry,
} from '../types';
import {
  GROUP_CHECKIN_STATS_VIEW,
  GROUP_COMMITMENTS_TABLE,
  GROUP_MEMBERSHIPS_TABLE,
  GROUPS_TABLE,
  JOURNEYS_TABLE,
  MEMBER_COVENANTS_TABLE,
  PRAYER_REQUESTS_TABLE,
  SHARED_JOURNAL_TABLE,
  getSupabase,
} from './supabase';

function randomInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

async function getUserId(): Promise<string> {
  const { data } = await getSupabase().auth.getUser();
  if (!data.user?.id) throw new Error('Sign in required');
  return data.user.id;
}

export async function listMyGroups(): Promise<GroupRecord[]> {
  const userId = await getUserId();
  const { data: memberships, error: membershipError } = await getSupabase()
    .from(GROUP_MEMBERSHIPS_TABLE)
    .select('group_id')
    .eq('user_id', userId);

  if (membershipError) throw membershipError;
  const groupIds = (memberships ?? []).map((m) => m.group_id);
  if (groupIds.length === 0) return [];

  const { data, error } = await getSupabase()
    .from(GROUPS_TABLE)
    .select('*, journey:journeys(*)')
    .in('id', groupIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as GroupRecord[];
}

export async function getGroup(groupId: string): Promise<GroupRecord | null> {
  const { data, error } = await getSupabase()
    .from(GROUPS_TABLE)
    .select('*, journey:journeys(*)')
    .eq('id', groupId)
    .maybeSingle();

  if (error) throw error;
  return (data as GroupRecord | null) ?? null;
}

export async function getMyMembership(groupId: string): Promise<GroupMembership | null> {
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from(GROUP_MEMBERSHIPS_TABLE)
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as GroupMembership | null) ?? null;
}

export async function listGroupMemberships(groupId: string): Promise<GroupMembership[]> {
  const { data, error } = await getSupabase()
    .from(GROUP_MEMBERSHIPS_TABLE)
    .select('*')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as GroupMembership[];
}

export async function createGroup(input: CreateGroupInput): Promise<GroupRecord> {
  const userId = await getUserId();
  const client = getSupabase();

  const journeyPayload =
    input.journeyType === 'built-in'
      ? {
          type: 'built-in' as const,
          name: FASTED_JOURNEY.name,
          start_date: FASTED_JOURNEY.startDate,
          phases: FASTED_JOURNEY.phases,
          created_by: userId,
        }
      : {
          type: 'custom' as const,
          name: input.customJourney?.name ?? 'Custom Journey',
          start_date: input.customJourney?.startDate ?? null,
          phases: input.customJourney?.phases ?? [],
          created_by: userId,
        };

  const { data: journey, error: journeyError } = await client
    .from(JOURNEYS_TABLE)
    .insert(journeyPayload as Record<string, unknown>)
    .select('*')
    .single();

  if (journeyError) throw journeyError;

  let inviteCode = randomInviteCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: group, error: groupError } = await client
      .from(GROUPS_TABLE)
      .insert({
        name: input.name.trim(),
        journey_id: journey.id,
        invite_code: inviteCode,
        privacy: input.privacy,
        created_by: userId,
      })
      .select('*, journey:journeys(*)')
      .single();

    if (!groupError) {
      const { error: memberError } = await client.from(GROUP_MEMBERSHIPS_TABLE).insert({
        group_id: group.id,
        user_id: userId,
        role: 'leader',
        display_name: input.displayName?.trim() || null,
      });
      if (memberError) throw memberError;

      const commitments = input.commitments?.length
        ? input.commitments
        : createCommitmentPreset('fasted-default');

      const { error: commitmentError } = await client.from(GROUP_COMMITMENTS_TABLE).insert({
        group_id: group.id,
        commitments,
      });
      if (commitmentError) throw commitmentError;

      const leaderSignature =
        input.leaderSignature?.trim() || input.displayName?.trim() || 'Group Leader';

      const { error: covenantError } = await client.from(MEMBER_COVENANTS_TABLE).insert({
        group_id: group.id,
        user_id: userId,
        commitments_snapshot: commitments,
        signature: leaderSignature,
      });
      if (covenantError) throw covenantError;

      return group as GroupRecord;
    }

    if (groupError.code !== '23505') throw groupError;
    inviteCode = randomInviteCode();
  }

  throw new Error('Could not generate a unique invite code');
}

export async function joinGroupByCode(
  inviteCode: string,
  displayName?: string,
): Promise<string> {
  const { data, error } = await getSupabase().rpc('join_group_by_code', {
    p_invite_code: inviteCode.trim(),
    p_display_name: displayName?.trim() || null,
  });

  if (error) throw error;
  return data as string;
}

export async function previewGroupByCode(
  inviteCode: string,
): Promise<{ id: string; name: string; privacy: string } | null> {
  const { data, error } = await getSupabase().rpc('preview_group_by_code', {
    p_invite_code: inviteCode.trim(),
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ?? null;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await getSupabase()
    .from(GROUP_MEMBERSHIPS_TABLE)
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function getGroupCheckinStats(groupId: string): Promise<GroupCheckinStats | null> {
  const { data, error } = await getSupabase()
    .from(GROUP_CHECKIN_STATS_VIEW)
    .select('*')
    .eq('group_id', groupId)
    .maybeSingle();

  if (error) throw error;
  return (data as GroupCheckinStats | null) ?? null;
}

export async function getGroupCommitments(groupId: string): Promise<CommitmentDefinition[]> {
  const { data, error } = await getSupabase()
    .from(GROUP_COMMITMENTS_TABLE)
    .select('commitments')
    .eq('group_id', groupId)
    .maybeSingle();

  if (error) throw error;
  return (data?.commitments as CommitmentDefinition[] | undefined) ?? [];
}

export async function getMyCovenant(groupId: string): Promise<MemberCovenant | null> {
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from(MEMBER_COVENANTS_TABLE)
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as MemberCovenant | null) ?? null;
}

export async function listGroupCovenants(groupId: string): Promise<MemberCovenant[]> {
  const { data, error } = await getSupabase()
    .from(MEMBER_COVENANTS_TABLE)
    .select('*')
    .eq('group_id', groupId)
    .order('signed_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as MemberCovenant[];
}

export async function signMemberCovenant(
  groupId: string,
  signature: string,
): Promise<MemberCovenant> {
  const userId = await getUserId();
  const commitments = await getGroupCommitments(groupId);

  const { data, error } = await getSupabase()
    .from(MEMBER_COVENANTS_TABLE)
    .insert({
      group_id: groupId,
      user_id: userId,
      commitments_snapshot: commitments,
      signature: signature.trim(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as MemberCovenant;
}

type LeaderMemberProgressRow = {
  user_id: string;
  group_check_ins: Record<string, import('../types').GroupCheckInRecord[]>;
  check_in_streak: number;
};

async function getLeaderMemberProgress(groupId: string): Promise<Map<string, LeaderMemberProgressRow>> {
  const { data, error } = await getSupabase().rpc('get_leader_member_progress', {
    p_group_id: groupId,
  });

  if (error) throw error;

  const map = new Map<string, LeaderMemberProgressRow>();
  for (const row of (data ?? []) as LeaderMemberProgressRow[]) {
    map.set(row.user_id, row);
  }
  return map;
}

export async function getMemberProgressSummaries(
  groupId: string,
  privacy: 'anonymous' | 'named',
  journeyStartDate?: string | null,
): Promise<MemberProgressSummary[]> {
  const [memberships, commitments, covenantRows, leaderProgress] = await Promise.all([
    listGroupMemberships(groupId),
    getGroupCommitments(groupId),
    listGroupCovenants(groupId),
    getLeaderMemberProgress(groupId),
  ]);

  if (memberships.length === 0) return [];

  const covenantByUser = new Map(covenantRows.map((c) => [c.user_id, c]));
  const today = new Date().toISOString().slice(0, 10);
  const journeyStart = journeyStartDate ?? today;

  return memberships.map((membership) => {
    const progressRow = leaderProgress.get(membership.user_id);
    const groupRecords = progressRow?.group_check_ins?.[groupId] ?? [];
    const todayRecord = getGroupCheckInForDate(groupRecords, today);
    const lastRecord =
      groupRecords.length > 0 ? groupRecords[groupRecords.length - 1] : null;

    const streak = computeGroupCheckInStreak(groupRecords, commitments, today);
    const stats = computeGroupCompletionStats(groupRecords, commitments, journeyStart, today);

    return {
      user_id: membership.user_id,
      display_name: privacy === 'named' ? membership.display_name : null,
      check_in_count: groupRecords.filter((r) =>
        allCommitmentsHonored(commitments, r.results),
      ).length,
      journal_count: 0,
      last_check_in: lastRecord?.date ?? null,
      today_commitments:
        privacy === 'named'
          ? buildTodayCommitmentStatus(commitments, todayRecord?.results)
          : undefined,
      streak,
      completion_rate: stats.completionRate,
      days_missed: stats.daysMissed,
      has_covenant: covenantByUser.has(membership.user_id),
    };
  });
}

export async function listSharedJournalEntries(groupId: string): Promise<SharedJournalEntry[]> {
  const { data, error } = await getSupabase()
    .from(SHARED_JOURNAL_TABLE)
    .select('*')
    .eq('group_id', groupId)
    .order('shared_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as SharedJournalEntry[];
}

export async function shareJournalEntry(
  groupId: string,
  content: Record<string, unknown>,
  phaseId?: number,
): Promise<void> {
  const userId = await getUserId();
  const { error } = await getSupabase().from(SHARED_JOURNAL_TABLE).insert({
    group_id: groupId,
    user_id: userId,
    content,
    phase_id: phaseId ?? null,
  });

  if (error) throw error;
}

export async function listPrayerRequests(groupId: string): Promise<PrayerRequest[]> {
  const { data, error } = await getSupabase()
    .from(PRAYER_REQUESTS_TABLE)
    .select('*')
    .eq('group_id', groupId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as PrayerRequest[];
}

export async function createPrayerRequest(
  groupId: string,
  content: string,
  isAnonymous: boolean,
): Promise<void> {
  const userId = await getUserId();
  const { error } = await getSupabase().from(PRAYER_REQUESTS_TABLE).insert({
    group_id: groupId,
    user_id: userId,
    content: content.trim(),
    is_anonymous: isAnonymous,
  });

  if (error) throw error;
}

export async function setPrayerRequestPinned(id: string, pinned: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from(PRAYER_REQUESTS_TABLE)
    .update({ pinned })
    .eq('id', id);

  if (error) throw error;
}

export function groupJourneyToLocalJourney(
  record: GroupRecord['journey'],
): import('../types').Journey | null {
  if (!record) return null;
  if (record.type === 'built-in') return { ...FASTED_JOURNEY };

  if (!record.start_date || !record.phases?.length) return null;

  return {
    id: record.id,
    name: record.name,
    startDate: record.start_date,
    phases: record.phases,
  };
}
