import { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../../api/client';
import { login } from '../api/auth.api';
import { setToken } from '../utils/auth-token.util';
import { sanitizeRedirectPath } from '../utils/redirect.util';

export function useLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);
      setIsSubmitting(true);

      try {
        const response = await login({ username, password });
        setToken(response.accessToken);
        const redirectTo = sanitizeRedirectPath(searchParams.get('redirect'));
        navigate(redirectTo, { replace: true });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setError('Invalid credentials');
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Login failed. Please try again.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [username, password, searchParams, navigate],
  );

  return {
    username,
    password,
    error,
    isSubmitting,
    setUsername,
    setPassword,
    handleSubmit,
  };
}
