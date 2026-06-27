import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { consumeAuthReturnPath } from '../lib/authReturnPath';

/** After OAuth or restored session, send the user back to the page that required auth. */
export function AuthReturnRedirect() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoggedIn) return;

    const returnPath = consumeAuthReturnPath();
    if (returnPath && returnPath !== location.pathname) {
      navigate(returnPath, { replace: true });
    }
  }, [isLoggedIn, location.pathname, navigate]);

  return null;
}
