import { Navigate, Outlet } from 'react-router-dom';
import { getToken } from '../utils/auth-token.util';

export function RequireGuest() {
  if (getToken()) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
