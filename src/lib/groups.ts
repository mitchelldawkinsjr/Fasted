import { FASTED_JOURNEY } from '../data/phaseTemplates';
import type {
  CreateGroupInput,
  GroupCheckinStats,
  GroupMembership,
  GroupRecord,
  MemberProgressSummary,
  PrayerRequest,
  SharedJournalEntry,
  UserProgress,
} from '../types';
import {
  GROUP_CHECKIN_STATS_VIEW,
  GROUP_MEMBERSHIPS_TABLE,
  GROUPS_TABLE,
  JOURNEYS_TABLE,
  PRAYER_REQUESTS_TABLE,
  PROGRESS_TABLE,
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

export async function getMemberProgressSummaries(
  groupId: string,
  privacy: 'anonymous' | 'named',
): Promise<MemberProgressSummary[]> {
  const memberships = await listGroupMemberships(groupId);
  if (memberships.length === 0) return [];

  const userIds = memberships.map((m) => m.user_id);
  const { data, error } = await getSupabase()
    .from(PROGRESS_TABLE)
    .select('user_id, data')
    .in('user_id', userIds);

  if (error) throw error;

  const progressByUser = new Map<string, UserProgress>();
  for (const row of data ?? []) {
    progressByUser.set(row.user_id, row.data as UserProgress);
  }

  return memberships.map((membership) => {
    const progress = progressByUser.get(membership.user_id);
    const checkIns = progress?.checkIns ?? [];
    const lastCheckIn = checkIns.length > 0 ? checkIns[checkIns.length - 1].date : null;

    return {
      user_id: membership.user_id,
      display_name: privacy === 'named' ? membership.display_name : null,
      check_in_count: checkIns.length,
      journal_count: progress?.journalEntries?.length ?? 0,
      last_check_in: lastCheckIn,
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
