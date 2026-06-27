import { useEffect, useState } from 'react';
import { LoadingButton } from './LoadingButton';
import { Icon } from './Icon';
import { useAuth } from '../hooks/useAuth';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { formatError, messages } from '../lib/messages';
import { signIn, signOut, signUp, syncNow, updateUserProfile } from '../lib/sync';
import type { SyncState } from '../lib/sync';
import { toast } from '../lib/toast';

function formatSyncedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function SyncStatusPill({ state }: { state: SyncState }) {
  const styles: Record<SyncState, string> = {
    idle: 'bg-surface-container-high text-on-surface-variant',
    syncing: 'bg-secondary/15 text-primary',
    synced: 'bg-secondary/15 text-secondary',
    offline: 'bg-tertiary-container/20 text-on-tertiary-container',
    error: 'bg-error/10 text-error',
  };

  const labels: Record<SyncState, string> = {
    idle: 'Not synced yet',
    syncing: 'Syncing…',
    synced: 'Synced',
    offline: 'Offline',
    error: 'Sync issue',
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-label-caps ${styles[state]}`}>
      {labels[state]}
    </span>
  );
}

export function CloudSyncSection() {
  const { isConfigured, isLoggedIn, email, name } = useAuth();
  const syncStatus = useSyncStatus();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [formEmail, setFormEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [profileName, setProfileName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      setProfileName(name ?? '');
    }
  }, [isLoggedIn, name]);

  const inputClass =
    'w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  if (!isConfigured) {
    return (
      <section className="stitch-card overflow-hidden">
        <div className="border-b border-surface-variant px-gutter py-4">
          <h3 className="label-caps text-secondary">CLOUD SYNC</h3>
        </div>
        <p className="p-gutter text-body-md text-on-surface-variant">
          Cloud sync is not configured. Set{' '}
          <code className="text-primary">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-primary">VITE_SUPABASE_ANON_KEY</code> in{' '}
          <code className="text-primary">.env.local</code> and rebuild. See{' '}
          <code className="text-primary">docker/SETUP.md</code>.
        </p>
      </section>
    );
  }

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === 'sign-in') {
        await signIn(formEmail, password);
        toast.success(messages.sync.signedIn);
      } else {
        await signUp(formEmail, password, passwordConfirm, profileName);
        toast.success(messages.sync.accountCreated);
      }
      setPassword('');
      setPasswordConfirm('');
      setProfileName('');
    } catch (err) {
      toast.error(formatError(err, messages.sync.authFailed));
    } finally {
      setBusy(false);
    }
  };

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await updateUserProfile(profileName);
      toast.success(messages.save.profile);
    } catch (err) {
      toast.error(formatError(err, messages.sync.profileFailed));
    } finally {
      setBusy(false);
    }
  };

  const handleSyncNow = async () => {
    setBusy(true);
    try {
      await syncNow();
      toast.success(messages.sync.synced);
    } catch (err) {
      toast.error(formatError(err, messages.sync.failed));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = () => {
    void signOut();
    toast.info(messages.sync.signedOut);
  };

  const statusDetail =
    syncStatus.state === 'synced' && syncStatus.lastSyncedAt
      ? `Last synced ${formatSyncedAt(syncStatus.lastSyncedAt)}`
      : syncStatus.state === 'offline'
        ? 'Saved locally on this device'
        : syncStatus.state === 'error'
          ? 'Check your connection and try again'
          : syncStatus.state === 'syncing'
            ? 'Uploading your latest progress'
            : 'Sign in to back up your journey';

  return (
    <section className="stitch-card overflow-hidden">
      <div className="border-b border-surface-variant px-gutter py-4">
        <h3 className="label-caps text-secondary">CLOUD SYNC</h3>
      </div>

      {isLoggedIn ? (
        <div className="divide-y divide-surface-variant">
          <form onSubmit={(e) => void handleProfileSave(e)} className="space-y-3 p-gutter">
            <div>
              <p className="text-label-caps text-on-surface-variant">Signed in as</p>
              <p className="text-body-md text-on-surface">{email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SyncStatusPill state={syncStatus.state} />
              <span className="text-label-caps text-on-surface-variant">{statusDetail}</span>
            </div>
            <label className="block">
              <span className="mb-1 block text-body-md text-on-surface">Profile name</span>
              <input
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className={inputClass}
              />
            </label>
            <LoadingButton
              type="submit"
              loading={busy}
              loadingLabel="Saving…"
              variant="secondary"
              className="w-full"
            >
              Save Profile
            </LoadingButton>
          </form>
          <div className="p-gutter">
            <p className="text-body-md text-on-surface-variant">
              Journal and progress sync to your server when you save. Works offline; syncs when
              back online.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleSyncNow()}
            disabled={busy}
            className="group flex w-full items-center justify-between p-gutter transition-colors hover:bg-surface-container disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <Icon name="cloud_sync" className="text-on-surface-variant group-hover:text-primary" />
              <span className="text-body-md text-on-surface">Sync now</span>
            </div>
            <Icon name="chevron_right" className="text-outline-variant" />
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="group flex w-full items-center gap-4 p-gutter text-body-md text-on-surface transition-colors hover:bg-surface-container"
          >
            <Icon name="logout" className="text-on-surface-variant group-hover:text-primary" />
            Sign out
          </button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleAuth(e)} className="space-y-4 p-gutter">
          <p className="text-body-md text-on-surface-variant">
            Optional. Sign in to back up check-ins, journal, and badges to your server.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('sign-in')}
              className={`flex-1 rounded-xl px-3 py-2 text-body-md ${
                mode === 'sign-in'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('sign-up')}
              className={`flex-1 rounded-xl px-3 py-2 text-body-md ${
                mode === 'sign-up'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              Create account
            </button>
          </div>

          <label className="block">
            <span className="mb-1 block text-body-md text-on-surface">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className={inputClass}
            />
          </label>

          {mode === 'sign-up' && (
            <label className="block">
              <span className="mb-1 block text-body-md text-on-surface">Profile name</span>
              <input
                type="text"
                autoComplete="name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className={inputClass}
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-body-md text-on-surface">Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>

          {mode === 'sign-up' && (
            <label className="block">
              <span className="mb-1 block text-body-md text-on-surface">Confirm password</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className={inputClass}
              />
            </label>
          )}

          <LoadingButton type="submit" loading={busy} className="w-full">
            {mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </LoadingButton>
        </form>
      )}
    </section>
  );
}
