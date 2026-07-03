import { useCallback, useEffect, useState } from 'react';
import {
    NAVIGATOR_BAR_DEFAULT_OPEN,
    NAVIGATOR_BAR_ENABLED,
    NAV_OPEN_STORAGE_KEY,
} from '../config/navigation.config';

function readNavOpenPreference(): boolean {
    if (!NAVIGATOR_BAR_ENABLED) {
        return false;
    }

    try {
        const stored = localStorage.getItem(NAV_OPEN_STORAGE_KEY);
        if (stored === null) {
            return NAVIGATOR_BAR_DEFAULT_OPEN;
        }
        return stored === 'true';
    } catch {
        return NAVIGATOR_BAR_DEFAULT_OPEN;
    }
}

export function useNavigatorBarOpen() {
    const [isOpen, setIsOpen] = useState(readNavOpenPreference);

    useEffect(() => {
        if (!NAVIGATOR_BAR_ENABLED) {
            return;
        }

        try {
            localStorage.setItem(NAV_OPEN_STORAGE_KEY, String(isOpen));
        } catch {
            // ignore storage errors
        }
    }, [isOpen]);

    const toggle = useCallback(() => {
        setIsOpen((open) => !open);
    }, []);

    return { isOpen, toggle };
}
