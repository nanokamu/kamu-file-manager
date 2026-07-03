import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  registerUnauthorizedHandler,
  unregisterUnauthorizedHandler,
} from '../utils/auth-session.util';

export function AuthSessionRegistrar() {
  const navigate = useNavigate();

  useEffect(() => {
    registerUnauthorizedHandler((loginPath) => {
      navigate(loginPath, { replace: true });
    });
    return () => unregisterUnauthorizedHandler();
  }, [navigate]);

  return null;
}
