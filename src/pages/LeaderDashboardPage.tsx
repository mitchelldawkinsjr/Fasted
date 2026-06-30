import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { RequireAuth } from '../components/RequireAuth';
import {
  getGroup,
  getMemberProgressSummaries,
  getMyMembership,
  groupJourneyToLocalJourney,
  listGroupMemberships,
  setPrayerRequestPinned,
  listPrayerRequests,
} from '../lib/groups';
import type { GroupRecord, MemberProgressSummary, PrayerRequest } from '../types';
import { toast } from '../lib/toast';

export function LeaderDashboardPage() {
  const { id = '' } = useParams();
  const [group, setGroup] = useState<GroupRecord | null>(null);
  const [members, setMembers] = useState<MemberProgressSummary[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [canViewDashboard, setCanViewDashboard] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [groupData, membership, prayerList, memberships] = await Promise.all([
        getGroup(id),
        getMyMembership(id),
        listPrayerRequests(id),
        listGroupMemberships(id),
      ]);

      if (membership?.role !== 'leader') {
        toast.error('Leader access required');
        setGroup(groupData);
        setCanViewDashboard(false);
        setLoading(false);
        return;
      }

      setGroup(groupData);
      setCanViewDashboard(true);
      setPrayers(prayerList);
      setMemberCount(memberships.length);

      if (groupData) {
        const journey = groupJourneyToLocalJourney(groupData.journey);
        const summaries = await getMemberProgressSummaries(
          id,
          groupData.privacy,
          journey?.startDate ?? groupData.journey?.start_date,
        );
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
  const isLeaderView = group && canViewDashboard;
  const totalCheckins = members.reduce((sum, member) => sum + member.check_in_count, 0);
  const avgCheckinsPerMember =
    memberCount > 0 ? Math.round((totalCheckins / memberCount) * 100) / 100 : null;

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
                <p className="text-headline-md text-primary">{memberCount}</p>
                <p className="label-caps text-on-surface-variant">Members</p>
              </div>
              <div className="stitch-card p-gutter text-center">
                <p className="text-headline-md text-primary">{totalCheckins}</p>
                <p className="label-caps text-on-surface-variant">Total check-ins</p>
              </div>
              <div className="stitch-card p-gutter text-center col-span-2">
                <p className="text-headline-md text-primary">
                  {avgCheckinsPerMember ?? '—'}
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
                    <li key={member.user_id} className="space-y-3 p-gutter">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-body-md text-on-surface">
                            {member.display_name ?? 'Member'}
                          </p>
                          <p className="text-label-caps text-on-surface-variant">
                            Last honor: {member.last_check_in ?? '—'}
                          </p>
                        </div>
                        <div className="text-right text-label-caps text-on-surface-variant">
                          <p>Streak: {member.streak ?? 0} days</p>
                          <p>Completion: {member.completion_rate ?? 0}%</p>
                          <p>Days missed: {member.days_missed ?? 0}</p>
                        </div>
                      </div>

                      {member.today_commitments && member.today_commitments.length > 0 && (
                        <div className="rounded-xl bg-surface-container-low p-3">
                          <p className="mb-2 label-caps text-secondary">Today&apos;s commitments</p>
                          <ul className="space-y-1">
                            {member.today_commitments.map((item) => (
                              <li
                                key={item.commitmentId}
                                className="flex items-center justify-between text-body-md"
                              >
                                <span className="text-on-surface">{item.label}</span>
                                <span
                                  className={
                                    item.honored ? 'text-secondary' : 'text-on-surface-variant'
                                  }
                                >
                                  {item.honored ? '✓' : '—'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {!member.has_covenant && (
                        <p className="text-label-caps text-on-surface-variant">
                          Covenant not signed yet
                        </p>
                      )}
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
