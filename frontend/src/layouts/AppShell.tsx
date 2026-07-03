import { Outlet } from "react-router-dom";

// layouts/AppShell.tsx — full-width app pages (file manager, settings, etc.)
export function AppShell() {
    return (
        <div className="flex h-svh w-full flex-col overflow-hidden">
            <Outlet />
        </div>
    );
}