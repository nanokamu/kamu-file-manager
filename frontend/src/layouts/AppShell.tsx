import { Outlet } from "react-router-dom";

// layouts/AppShell.tsx — constrained pages (file manager, settings, etc.)
export function AppShell() {
    return (
        <div className="mx-auto flex h-svh w-full max-w-6xl flex-col overflow-hidden border-x border-[var(--border)]">
            {/* <div className="mx-auto w-full max-w-6xl min-h-svh border-x border-border"> */}
            <Outlet />
        </div>
    );
}