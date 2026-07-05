import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { Icon } from '../components/Icon';
import { LoadingButton } from '../components/LoadingButton';
import { RequireAuth } from '../components/RequireAuth';
import { useGroups } from '../hooks/useGroups';
import { formatDisplayDate } from '../lib/dateUtils';
import { getJourneyPlanEnd } from '../lib/journey';
import { groupJourneyToLocalJourney } from '../lib/groups';

export function GroupsHubPage() {
  const { groups, loading, error, refresh } = useGroups();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    navigate(`/join/${joinCode.trim()}`);
  };

  return (
    <RequireAuth>
      <div className="space-y-stack-lg animate-fade-in-up">
        <section>
          <h2 className="font-display text-headline-lg-mobile text-primary">Your Groups</h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Journey together with friends, your church, or your community.
          </p>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row" data-tour="groups-create">
          <LoadingButton type="button" className="flex-1" onClick={() => setCreateOpen(true)}>
            <span className="inline-flex items-center justify-center gap-2">
              <Icon name="group_add" size={20} />
              Create Group
            </span>
          </LoadingButton>
        </div>

        <section className="stitch-card p-gutter space-y-3" data-tour="groups-join">
          <h3 className="label-caps text-secondary">Join with invite code</h3>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABCD1234"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md uppercase tracking-widest focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          />
          <LoadingButton
            type="button"
            disabled={!joinCode.trim()}
            className="w-full"
            onClick={handleJoin}
          >
            Join Group
          </LoadingButton>
        </section>

        {loading && <p className="text-body-md text-on-surface-variant">Loading groups…</p>}
        {error && <p className="text-body-md text-error">{error}</p>}

        {!loading && groups.length === 0 && (
          <p className="text-body-md text-on-surface-variant">
            You are not in any groups yet. Create one or join with an invite code.
          </p>
        )}

        <ul className="space-y-3">
          {groups.map((group) => {
            const journey = groupJourneyToLocalJourney(group.journey);
            const planEnd = journey ? getJourneyPlanEnd(journey) : null;

            return (
              <li key={group.id}>
                <Link
                  to={`/groups/${group.id}`}
                  className="stitch-card flex items-center justify-between p-gutter transition-colors hover:bg-surface-container-low"
                >
                  <div>
                    <p className="text-body-md font-medium text-on-surface">{group.name}</p>
                    <p className="text-label-caps text-on-surface-variant">
                      {journey?.name ?? 'Journey'} · {group.privacy} mode
                    </p>
                    {journey && planEnd && (
                      <p className="text-label-caps text-on-surface-variant">
                        {formatDisplayDate(journey.startDate)} – {formatDisplayDate(planEnd)}
                      </p>
                    )}
                  </div>
                  <Icon name="chevron_right" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(groupId) => {
          void refresh();
          navigate(`/groups/${groupId}`);
        }}
      />
    </RequireAuth>
  );
}
