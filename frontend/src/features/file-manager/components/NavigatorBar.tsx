import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ConfirmModal } from '../../../shared/components/ConfirmModal';
import { useLogout } from '../../user/hooks/useLogout';

interface NavigatorBarProps {
    isOpen: boolean;
    onToggle: () => void;
}

const NAV_ITEMS = [
    {
        to: '/',
        label: 'Files',
        end: true,
        icon: (
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
        ),
    },
    {
        to: '/editor',
        label: 'Code Editor',
        end: false,
        icon: (
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
        ),
    },
] as const;

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 ${isActive
        ? 'bg-blue-50 text-blue-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

const logoutButtonClass =
    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 cursor-pointer transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20';

export function NavigatorBar({ isOpen, onToggle }: NavigatorBarProps) {
    const { logout } = useLogout();
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const toggleLabel = isOpen ? 'Collapse navigation' : 'Expand navigation';

    return (
        <aside
            aria-label="App navigation"
            className={`flex shrink-0 flex-col overflow-hidden border-r border-slate-300/80 bg-slate-50 transition-[width] duration-200 ${isOpen ? 'w-52' : 'w-10'
                }`}
        >
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                aria-label={toggleLabel}
                title={toggleLabel}
                className={`flex w-full shrink-0 items-center border-b border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/20 ${isOpen ? 'justify-between gap-2 px-3 py-2.5' : 'justify-center py-3'
                    }`}
            >
                {isOpen && (
                    <span className="text-xs font-semibold uppercase tracking-wider">
                        Navigation
                    </span>
                )}
                {isOpen ? (
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                ) : (
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                )}
            </button>

            {isOpen && (
                <>
                    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
                        {NAV_ITEMS.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={navLinkClass}
                            >
                                {item.icon}
                                <span className="truncate">{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                    <div className="shrink-0 border-t border-slate-200 p-2">
                        <button
                            type="button"
                            onClick={() => setIsLogoutConfirmOpen(true)}
                            aria-label="Log out"
                            className={logoutButtonClass}
                        >
                            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="truncate">Log out</span>
                        </button>
                    </div>
                </>
            )}

            <ConfirmModal
                isOpen={isLogoutConfirmOpen}
                onClose={() => setIsLogoutConfirmOpen(false)}
                onConfirm={() => {
                    setIsLogoutConfirmOpen(false);
                    logout();
                }}
                title="Log out?"
                description="You will need to sign in again to access your files."
                confirmLabel="Log out"
                variant="danger"
                initialFocus="cancel"
            />
        </aside>
    );
}
