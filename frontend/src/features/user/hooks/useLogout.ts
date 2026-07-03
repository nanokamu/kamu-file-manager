import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearToken } from '../utils/auth-token.util';

export function useLogout() {
  const navigate = useNavigate();

  const logout = useCallback(() => {
    clearToken();
    navigate('/login', { replace: true });
  }, [navigate]);

  return { logout };
}
