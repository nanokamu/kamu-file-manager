/** When false, the left navigator bar is not rendered. */
export const NAVIGATOR_BAR_ENABLED = true;

/** Default open state when the navigator is enabled and no localStorage preference exists. */
export const NAVIGATOR_BAR_DEFAULT_OPEN = true;

export const NAV_OPEN_STORAGE_KEY = 'fileManager.navOpen';

export const NAV_ITEMS = [
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
