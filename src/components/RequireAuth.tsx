import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { setAuthReturnPath } from '../lib/authReturnPath';
import { isSyncConfigured } from '../lib/supabase';

type Props = {
  children: React.ReactNode;
};

export function RequireAuth({ children }: Props) {
  const { isLoggedIn, isConfigured, initialized } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return <p className="text-body-md text-on-surface-variant">Loading…</p>;
  }

  if (!isConfigured || !isSyncConfigured()) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <h2 className="font-display text-headline-lg-mobile text-primary">Sign in required</h2>
        <p className="text-body-md text-on-surface-variant">
          Group features require cloud sync. Configure Supabase in{' '}
          <Link to="/settings" className="text-secondary underline">
            Settings
          </Link>{' '}
          and sign in to continue.
        </p>
      </div>
    );
  }

  if (!isLoggedIn) {
    const returnPath = `${location.pathname}${location.search}`;
    setAuthReturnPath(returnPath);

    return (
      <Navigate
        to="/settings#account-sign-in"
        replace
        state={{ from: returnPath, message: 'Sign in to continue.' }}
      />
    );
  }

  return <>{children}</>;
}
