import { Outlet } from 'react-router-dom';

export function LoginShell() {
  return (
    <div className="flex h-svh w-full items-center justify-center bg-[var(--bg)]">
      <Outlet />
    </div>
  );
}
