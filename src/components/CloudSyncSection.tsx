import { useState } from 'react';
import { Icon } from './Icon';
import { useAuth } from '../hooks/useAuth';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { signIn, signOut, signUp, syncNow } from '../lib/sync';

function formatSyncedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function CloudSyncSection() {
  const { isConfigured, isLoggedIn, email } = useAuth();
  const syncStatus = useSyncStatus();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [formEmail, setFormEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

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
          <code className="text-primary">VITE_POCKETBASE_URL</code> in{' '}
          <code className="text-primary">.env.local</code> and rebuild. See{' '}
          <code className="text-primary">docker/SETUP.md</code>.
        </p>
      </section>
    );
  }

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'sign-in') {
        await signIn(formEmail, password);
        setMessage('Signed in. Your progress is syncing.');
      } else {
        await signUp(formEmail, password, passwordConfirm);
        setMessage('Account created. Your progress is syncing.');
      }
      setPassword('');
      setPasswordConfirm('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSyncNow = async () => {
    setBusy(true);
    setMessage('');
    try {
      await syncNow();
      setMessage('Synced to cloud.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    setMessage('Signed out. Local data remains on this device.');
  };

  const statusLabel =
    syncStatus.state === 'syncing'
      ? 'Syncing…'
      : syncStatus.state === 'synced' && syncStatus.lastSyncedAt
        ? `Last synced ${formatSyncedAt(syncStatus.lastSyncedAt)}`
        : syncStatus.state === 'offline'
          ? 'Offline — saved locally'
          : syncStatus.state === 'error'
            ? syncStatus.error ?? 'Sync error'
            : 'Not synced yet';

  return (
    <section className="stitch-card overflow-hidden">
      <div className="border-b border-surface-variant px-gutter py-4">
        <h3 className="label-caps text-secondary">CLOUD SYNC</h3>
      </div>

      {isLoggedIn ? (
        <div className="divide-y divide-surface-variant">
          <div className="p-gutter">
            <p className="text-body-md text-on-surface">{email}</p>
            <p className="mt-1 text-label-caps text-on-surface-variant">{statusLabel}</p>
            <p className="mt-2 text-body-md text-on-surface-variant">
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
            Optional. Sign in to back up check-ins, journal, and badges to your PocketBase server.
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

          <button type="submit" disabled={busy} className="btn-stitch-primary w-full">
            {busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      )}

      {message && <p className="border-t border-surface-variant p-gutter text-body-md text-on-surface-variant">{message}</p>}
    </section>
  );
}
