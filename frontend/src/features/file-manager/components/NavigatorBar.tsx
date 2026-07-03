import { NavLink } from 'react-router-dom';

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

export function NavigatorBar({ isOpen, onToggle }: NavigatorBarProps) {
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
            )}
        </aside>
    );
}
