const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60';

interface LoginFormProps {
  username: string;
  password: string;
  error: string | null;
  isSubmitting: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function LoginForm({
  username,
  password,
  error,
  isSubmitting,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--bg)] p-8 shadow-[var(--shadow)]"
    >
      <h1 className="mb-1 text-xl font-semibold text-[var(--text-h)]">Sign in</h1>
      <p className="mb-6 text-sm text-[var(--text)]">Enter your credentials to continue</p>

      <div className="flex flex-col gap-4 text-left">
        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-medium text-[var(--text-h)]">
            Username
          </label>
          <input
            id="username"
            type="text"
            name="username"
            autoComplete="username"
            required
            disabled={isSubmitting}
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--text-h)]">
            Password
          </label>
          <input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            disabled={isSubmitting}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </form>
  );
}
