import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getMe } from '../api/auth.api';
import { getToken } from '../utils/auth-token.util';
import { buildLoginPath } from '../utils/login-redirect.util';

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export function RequireAuth() {
  const location = useLocation();
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      if (!getToken()) {
        if (!cancelled) setAuthState('unauthenticated');
        return;
      }

      try {
        await getMe();
        if (!cancelled) setAuthState('authenticated');
      } catch {
        if (!cancelled) setAuthState('unauthenticated');
      }
    }

    void validate();
    return () => {
      cancelled = true;
    };
  }, []);

  if (authState === 'loading') {
    return (
      <div className="flex h-svh items-center justify-center text-[var(--text)]">
        Loading...
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <Navigate
        to={buildLoginPath(location.pathname, location.search)}
        replace
      />
    );
  }

  return <Outlet />;
}
