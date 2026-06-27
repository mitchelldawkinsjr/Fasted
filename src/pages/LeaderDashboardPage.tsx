import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { RequireAuth } from '../components/RequireAuth';
import {
  getGroup,
  getGroupCheckinStats,
  getMemberProgressSummaries,
  getMyMembership,
  groupJourneyToLocalJourney,
  listGroupMemberships,
  setPrayerRequestPinned,
  listPrayerRequests,
} from '../lib/groups';
import type { GroupCheckinStats, GroupRecord, MemberProgressSummary, PrayerRequest } from '../types';
import { toast } from '../lib/toast';

export function LeaderDashboardPage() {
  const { id = '' } = useParams();
  const [group, setGroup] = useState<GroupRecord | null>(null);
  const [stats, setStats] = useState<GroupCheckinStats | null>(null);
  const [members, setMembers] = useState<MemberProgressSummary[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [groupData, membership, checkinStats, prayerList, memberships] = await Promise.all([
        getGroup(id),
        getMyMembership(id),
        getGroupCheckinStats(id),
        listPrayerRequests(id),
        listGroupMemberships(id),
      ]);

      if (membership?.role !== 'leader') {
        toast.error('Leader access required');
        setGroup(groupData);
        setLoading(false);
        return;
      }

      setGroup(groupData);
      setStats(checkinStats);
      setPrayers(prayerList);
      setMemberCount(memberships.length);

      if (groupData) {
        const summaries = await getMemberProgressSummaries(id, groupData.privacy);
        setMembers(summaries);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handlePin = async (prayerId: string, pinned: boolean) => {
    try {
      await setPrayerRequestPinned(prayerId, pinned);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update prayer');
    }
  };

  const journey = group ? groupJourneyToLocalJourney(group.journey) : null;
  const isLeaderView = group && stats;

  if (loading) {
    return (
      <RequireAuth>
        <p className="text-body-md text-on-surface-variant">Loading dashboard…</p>
      </RequireAuth>
    );
  }

  if (!group) {
    return (
      <RequireAuth>
        <p className="text-body-md text-on-surface-variant">Group not found.</p>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="space-y-stack-lg animate-fade-in-up">
        <Link to={`/groups/${group.id}`} className="inline-flex items-center gap-1 text-body-md text-secondary">
          <Icon name="arrow_back" size={18} />
          {group.name}
        </Link>

        <section>
          <h2 className="font-display text-headline-lg-mobile text-primary">Leader Dashboard</h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {group.privacy === 'anonymous'
              ? 'Anonymous mode — member identities are hidden.'
              : 'Named mode — member progress is shown below.'}
          </p>
        </section>

        {!isLeaderView ? (
          <p className="text-body-md text-error">You must be a group leader to view this dashboard.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="stitch-card p-gutter text-center">
                <p className="text-headline-md text-primary">{memberCount || stats.member_count}</p>
                <p className="label-caps text-on-surface-variant">Members</p>
              </div>
              <div className="stitch-card p-gutter text-center">
                <p className="text-headline-md text-primary">{stats.total_checkins}</p>
                <p className="label-caps text-on-surface-variant">Total check-ins</p>
              </div>
              <div className="stitch-card p-gutter text-center col-span-2">
                <p className="text-headline-md text-primary">
                  {stats.avg_checkins_per_member ?? '—'}
                </p>
                <p className="label-caps text-on-surface-variant">Avg check-ins per member</p>
              </div>
            </div>

            {group.privacy === 'named' && (
              <section className="stitch-card overflow-hidden">
                <div className="border-b border-surface-variant px-gutter py-4">
                  <h3 className="label-caps text-secondary">Member progress</h3>
                </div>
                <ul className="divide-y divide-surface-variant">
                  {members.map((member) => (
                    <li key={member.user_id} className="flex items-center justify-between p-gutter">
                      <div>
                        <p className="text-body-md text-on-surface">
                          {member.display_name ?? 'Member'}
                        </p>
                        <p className="text-label-caps text-on-surface-variant">
                          Last check-in: {member.last_check_in ?? '—'}
                        </p>
                      </div>
                      <div className="text-right text-label-caps text-on-surface-variant">
                        <p>{member.check_in_count} check-ins</p>
                        <p>{member.journal_count} journal</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {journey && (
              <p className="text-body-md text-on-surface-variant">
                Group journey: <strong>{journey.name}</strong>
              </p>
            )}

            <section className="stitch-card overflow-hidden">
              <div className="border-b border-surface-variant px-gutter py-4">
                <h3 className="label-caps text-secondary">Moderate prayer wall</h3>
              </div>
              <ul className="divide-y divide-surface-variant">
                {prayers.map((prayer) => (
                  <li key={prayer.id} className="flex items-start justify-between gap-3 p-gutter">
                    <div>
                      <p className="text-body-md text-on-surface">{prayer.content}</p>
                      {prayer.pinned && (
                        <span className="label-caps text-secondary">Pinned</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg bg-surface-container px-3 py-1 text-label-caps"
                      onClick={() => void handlePin(prayer.id, !prayer.pinned)}
                    >
                      {prayer.pinned ? 'Unpin' : 'Pin'}
                    </button>
                  </li>
                ))}
                {prayers.length === 0 && (
                  <li className="p-gutter text-body-md text-on-surface-variant">No prayers yet.</li>
                )}
              </ul>
            </section>
          </>
        )}
      </div>
    </RequireAuth>
  );
}
