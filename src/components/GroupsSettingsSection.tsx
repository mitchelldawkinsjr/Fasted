import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { useAuth } from '../hooks/useAuth';
import { isSyncConfigured } from '../lib/supabase';

export function GroupsSettingsSection() {
  const { isLoggedIn } = useAuth();

  if (!isSyncConfigured()) {
    return (
      <section className="stitch-card overflow-hidden">
        <div className="border-b border-surface-variant px-gutter py-4">
          <h3 className="label-caps text-secondary">GROUPS</h3>
        </div>
        <p className="p-gutter text-body-md text-on-surface-variant">
          Configure your account above to create or join fasting groups.
        </p>
      </section>
    );
  }

  return (
    <section className="stitch-card overflow-hidden">
      <div className="border-b border-surface-variant px-gutter py-4">
        <h3 className="label-caps text-secondary">GROUPS</h3>
      </div>
      <div className="p-gutter space-y-3">
        <p className="text-body-md text-on-surface-variant">
          {isLoggedIn
            ? 'Journey together with friends, your church, or your community.'
            : 'Create or join a group journey after signing in to your account above.'}
        </p>
        {isLoggedIn ? (
          <Link
            to="/groups"
            className="group flex w-full items-center justify-between rounded-xl bg-secondary-container px-4 py-3 text-on-secondary-container"
          >
            <span className="flex items-center gap-3 text-body-md">
              <Icon name="groups" />
              Your groups
            </span>
            <Icon name="chevron_right" />
          </Link>
        ) : (
          <a
            href="#account-sign-in"
            className="group flex w-full items-center justify-between rounded-xl bg-secondary-container px-4 py-3 text-on-secondary-container"
          >
            <span className="flex items-center gap-3 text-body-md">
              <Icon name="groups" />
              Create or join a group
            </span>
            <Icon name="chevron_right" />
          </a>
        )}
      </div>
    </section>
  );
}
