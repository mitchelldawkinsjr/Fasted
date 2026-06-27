import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isSyncConfigured } from '../lib/supabase';

type Props = {
  children: React.ReactNode;
};

export function RequireAuth({ children }: Props) {
  const { isLoggedIn, isConfigured } = useAuth();
  const location = useLocation();

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
    return (
      <Navigate
        to="/settings"
        replace
        state={{ from: location.pathname, message: 'Sign in to use group features.' }}
      />
    );
  }

  return <>{children}</>;
}
