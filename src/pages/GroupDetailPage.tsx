import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CovenantModal } from '../components/CovenantModal';
import { CommitmentList } from '../components/CommitmentList';
import { Icon } from '../components/Icon';
import { LoadingButton } from '../components/LoadingButton';
import { RequireAuth } from '../components/RequireAuth';
import { useAuth } from '../hooks/useAuth';
import { formatDisplayDate } from '../lib/dateUtils';
import {
  createPrayerRequest,
  getGroup,
  getGroupCommitments,
  getMyCovenant,
  getMyMembership,
  groupJourneyToLocalJourney,
  leaveGroup,
  listPrayerRequests,
  listSharedJournalEntries,
  shareJournalEntry,
  signMemberCovenant,
} from '../lib/groups';
import { getJourneyPlanEnd } from '../lib/journey';
import { getProgress } from '../lib/storage';
import type { CommitmentDefinition, GroupRecord, MemberCovenant, PrayerRequest, SharedJournalEntry } from '../types';
import { toast } from '../lib/toast';
import { confirmAction } from '../lib/confirm';

export function GroupDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupRecord | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [sharedEntries, setSharedEntries] = useState<SharedJournalEntry[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [prayerText, setPrayerText] = useState('');
  const [prayerAnonymous, setPrayerAnonymous] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [covenant, setCovenant] = useState<MemberCovenant | null>(null);
  const [commitments, setCommitments] = useState<CommitmentDefinition[]>([]);
  const [showCovenantModal, setShowCovenantModal] = useState(false);
  const [showSignGate, setShowSignGate] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [groupData, membership, journal, prayerList, groupCommitments, myCovenant] =
        await Promise.all([
        getGroup(id),
        getMyMembership(id),
        listSharedJournalEntries(id),
        listPrayerRequests(id),
        getGroupCommitments(id),
        getMyCovenant(id),
      ]);
      setGroup(groupData);
      setIsLeader(membership?.role === 'leader');
      setSharedEntries(journal);
      setPrayers(prayerList);
      setCommitments(groupCommitments);
      setCovenant(myCovenant);
      setShowSignGate(membership?.role === 'member' && !myCovenant);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const journey = group ? groupJourneyToLocalJourney(group.journey) : null;

  const handleShareLatestJournal = async () => {
    if (!group) return;
    const latest = getProgress().journalEntries[0];
    if (!latest) {
      toast.info('Write a journal entry first');
      return;
    }
    setBusy(true);
    try {
      await shareJournalEntry(group.id, latest as unknown as Record<string, unknown>);
      toast.success('Shared with group');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not share entry');
    } finally {
      setBusy(false);
    }
  };

  const handlePostPrayer = async () => {
    if (!group || !prayerText.trim()) return;
    setBusy(true);
    try {
      await createPrayerRequest(group.id, prayerText, prayerAnonymous);
      setPrayerText('');
      toast.success('Prayer request posted');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post prayer');
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!group) return;
    const confirmed = await confirmAction({
      title: 'Leave group?',
      message: 'You can rejoin later with the invite code.',
      confirmLabel: 'Leave',
      cancelLabel: 'Stay',
    });
    if (!confirmed) return;
    try {
      await leaveGroup(group.id);
      toast.success('Left group');
      navigate('/groups');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not leave group');
    }
  };

  if (loading) {
    return (
      <RequireAuth>
        <p className="text-body-md text-on-surface-variant">Loading group…</p>
      </RequireAuth>
    );
  }

  if (!group) {
    return (
      <RequireAuth>
        <p className="text-body-md text-on-surface-variant">Group not found.</p>
        <Link to="/groups" className="mt-4 inline-block text-secondary underline">
          Back to groups
        </Link>
      </RequireAuth>
    );
  }

  if (showSignGate) {
    return (
      <RequireAuth>
        <CovenantModal
          groupName={group.name}
          commitments={commitments}
          onSign={async (signature) => {
            await signMemberCovenant(group.id, signature);
            setShowSignGate(false);
            await refresh();
          }}
        />
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      {showCovenantModal && covenant && (
        <CovenantModal
          groupName={group.name}
          commitments={covenant.commitments_snapshot}
          existing={covenant}
          readOnly
          onClose={() => setShowCovenantModal(false)}
        />
      )}
      <div className="space-y-stack-lg animate-fade-in-up">
        <Link to="/groups" className="inline-flex items-center gap-1 text-body-md text-secondary">
          <Icon name="arrow_back" size={18} />
          All groups
        </Link>

        <section>
          <h2 className="font-display text-headline-lg-mobile text-primary">{group.name}</h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Invite code:{' '}
            <span className="font-mono tracking-widest text-on-surface">{group.invite_code}</span>
          </p>
          {journey && (
            <p className="text-label-caps text-on-surface-variant">
              {journey.name} · {formatDisplayDate(journey.startDate)} –{' '}
              {formatDisplayDate(getJourneyPlanEnd(journey))} · {group.privacy} mode
            </p>
          )}
        </section>

        {isLeader && (
          <Link
            to={`/groups/${group.id}/dashboard`}
            className="stitch-card flex items-center justify-between p-gutter"
          >
            <span className="flex items-center gap-3 text-body-md">
              <Icon name="query_stats" />
              Leader dashboard
            </span>
            <Icon name="chevron_right" />
          </Link>
        )}

        {covenant && (
          <button
            type="button"
            className="stitch-card flex w-full items-center justify-between p-gutter text-left"
            onClick={() => setShowCovenantModal(true)}
          >
            <span className="flex items-center gap-3 text-body-md">
              <Icon name="draw" />
              View signed covenant
            </span>
            <Icon name="chevron_right" />
          </button>
        )}

        {commitments.length > 0 && (
          <section className="stitch-card overflow-hidden">
            <div className="border-b border-surface-variant px-gutter py-4">
              <h3 className="label-caps text-secondary">Daily commitments</h3>
            </div>
            <CommitmentList
              commitments={commitments}
              className="space-y-2 p-gutter"
              showDetails={false}
            />
          </section>
        )}

        <section className="stitch-card overflow-hidden">
          <div className="border-b border-surface-variant px-gutter py-4">
            <h3 className="label-caps text-secondary">Prayer wall</h3>
          </div>
          <div className="space-y-3 p-gutter">
            <textarea
              value={prayerText}
              onChange={(e) => setPrayerText(e.target.value)}
              rows={3}
              placeholder="Share a prayer request with the group…"
              className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
            <label className="flex items-center gap-2 text-body-md">
              <input
                type="checkbox"
                checked={prayerAnonymous}
                onChange={(e) => setPrayerAnonymous(e.target.checked)}
              />
              Post anonymously
            </label>
            <LoadingButton
              type="button"
              loading={busy}
              disabled={!prayerText.trim()}
              className="w-full"
              onClick={() => void handlePostPrayer()}
            >
              Post prayer
            </LoadingButton>

            <ul className="space-y-2">
              {prayers.map((prayer) => (
                <li
                  key={prayer.id}
                  className={`rounded-xl p-3 ${prayer.pinned ? 'bg-secondary-container/40' : 'bg-surface-container-low'}`}
                >
                  {prayer.pinned && (
                    <span className="label-caps text-secondary">Pinned · </span>
                  )}
                  <p className="text-body-md text-on-surface">{prayer.content}</p>
                  <p className="mt-1 text-label-caps text-on-surface-variant">
                    {prayer.is_anonymous
                      ? 'Anonymous'
                      : prayer.user_id === user?.id
                        ? 'You'
                        : 'Group member'}{' '}
                    · {formatDisplayDate(prayer.created_at.slice(0, 10))}
                  </p>
                </li>
              ))}
              {prayers.length === 0 && (
                <p className="text-body-md text-on-surface-variant">No prayer requests yet.</p>
              )}
            </ul>
          </div>
        </section>

        <section className="stitch-card overflow-hidden">
          <div className="border-b border-surface-variant px-gutter py-4 flex items-center justify-between">
            <h3 className="label-caps text-secondary">Shared journal</h3>
            <LoadingButton type="button" loading={busy} onClick={() => void handleShareLatestJournal()}>
              Share latest
            </LoadingButton>
          </div>
          <ul className="divide-y divide-surface-variant p-gutter">
            {sharedEntries.map((entry) => (
              <li key={entry.id} className="py-3">
                <p className="text-label-caps text-on-surface-variant">
                  {entry.user_id === user?.id ? 'You' : 'Member'} ·{' '}
                  {formatDisplayDate(entry.shared_at.slice(0, 10))}
                </p>
                <p className="mt-1 text-body-md text-on-surface">
                  {(entry.content as { victory?: string; content?: string }).victory ??
                    (entry.content as { content?: string }).content ??
                    'Shared journal entry'}
                </p>
              </li>
            ))}
            {sharedEntries.length === 0 && (
              <li className="py-3 text-body-md text-on-surface-variant">
                No shared entries yet. Share your latest journal entry when you are ready.
              </li>
            )}
          </ul>
        </section>

        <LoadingButton type="button" variant="secondary" className="w-full" onClick={() => void handleLeave()}>
          Leave group
        </LoadingButton>
      </div>
    </RequireAuth>
  );
}
