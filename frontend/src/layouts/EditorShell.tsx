import { Outlet } from "react-router-dom";

// layouts/EditorShell.tsx — full-bleed pages (editor, preview)
export function EditorShell() {
    return (
        <div className="flex h-svh w-full flex-col overflow-hidden">
            <Outlet />
        </div>
    );
}