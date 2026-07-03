import { useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { useLogin } from './hooks/useLogin';

export default function LoginPage() {
  const {
    username,
    password,
    error,
    isSubmitting,
    setUsername,
    setPassword,
    handleSubmit,
  } = useLogin();

  useEffect(() => {
    document.title = 'Login';
  }, []);

  return (
    <LoginForm
      username={username}
      password={password}
      error={error}
      isSubmitting={isSubmitting}
      onUsernameChange={setUsername}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
    />
  );
}
