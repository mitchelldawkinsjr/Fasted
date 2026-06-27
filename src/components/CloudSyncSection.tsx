import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoadingButton } from './LoadingButton';
import { Icon } from './Icon';
import { useAuth } from '../hooks/useAuth';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { formatAuthError, formatError, messages } from '../lib/messages';
import { consumeAuthReturnPath, peekAuthReturnPath, setAuthReturnPath } from '../lib/authReturnPath';
import { signInWithOAuth, signOut, signUp, syncNow, updateUserProfile } from '../lib/sync';
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
  const { isConfigured, isLoggedIn, email, name, signIn } = useAuth();
  const syncStatus = useSyncStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const sectionRef = useRef<HTMLElement>(null);
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

  useEffect(() => {
    if (location.hash !== '#account-sign-in') return;
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash, location.key]);

  const redirectAfterAuth = () => {
    const returnPath = consumeAuthReturnPath();
    if (returnPath) {
      navigate(returnPath, { replace: true });
    }
  };

  const inputClass =
    'w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  if (!isConfigured) {
    return (
      <section className="stitch-card overflow-hidden">
        <div className="border-b border-surface-variant px-gutter py-4">
          <h3 className="label-caps text-secondary">ACCOUNT</h3>
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
        const result = await signIn(formEmail, password);
        toast.success(messages.sync.signedIn);
        if (result.syncWarning) {
          toast.warning(result.syncWarning);
        }
      } else {
        const result = await signUp(formEmail, password, passwordConfirm, profileName);
        toast.success(messages.sync.accountCreated);
        if (result.syncWarning) {
          toast.warning(result.syncWarning);
        }
      }
      setPassword('');
      setPasswordConfirm('');
      setProfileName('');
      redirectAfterAuth();
    } catch (err) {
      toast.error(formatAuthError(err, messages.sync.authFailed));
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

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setBusy(true);
    try {
      const returnPath = peekAuthReturnPath();
      if (returnPath) {
        setAuthReturnPath(returnPath);
      }
      await signInWithOAuth(provider);
      // Page will redirect; AuthReturnRedirect handles return path after OAuth
    } catch (err) {
      toast.error(formatAuthError(err, messages.sync.oauthFailed));
      setBusy(false);
    }
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
            : 'Sign in to back up your journey and join groups';

  return (
    <section
      id="account-sign-in"
      ref={sectionRef}
      className="stitch-card scroll-mt-24 overflow-hidden"
    >
      <div className="border-b border-surface-variant px-gutter py-4">
        <h3 className="label-caps text-secondary">ACCOUNT</h3>
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
            One account for cloud backup and group journeys. Sign in to sync check-ins, journal, and
            badges, and to create or join fasting groups.
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

          <div className="relative flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-outline-variant" />
            <span className="text-label-caps text-on-surface-variant">or continue with</span>
            <div className="h-px flex-1 bg-outline-variant" />
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleOAuth('google')}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-body-md text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => void handleOAuth('facebook')}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-outline-variant bg-surface-container px-4 py-3 text-body-md text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
              </svg>
              Continue with Facebook
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
