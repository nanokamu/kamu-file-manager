import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    content: ReactNode;
    children: ReactNode;
    delayMs?: number;
}

const TOOLTIP_GAP = 8;
const VIEWPORT_PADDING = 8;
const DEFAULT_SHOW_DELAY_MS = 400;

export function Tooltip({ content, children, delayMs = DEFAULT_SHOW_DELAY_MS }: TooltipProps) {
    const triggerRef = useRef<HTMLSpanElement>(null);
    const tooltipRef = useRef<HTMLSpanElement>(null);
    const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipStyle, setTooltipStyle] = useState<CSSProperties>({
        visibility: 'hidden',
    });

    const updatePosition = useCallback(() => {
        const trigger = triggerRef.current;
        const tooltip = tooltipRef.current;

        if (!trigger || !tooltip) {
            return;
        }

        const triggerRect = trigger.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top = triggerRect.top - tooltipRect.height - TOOLTIP_GAP;
        let left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;

        if (top < VIEWPORT_PADDING) {
            top = triggerRect.bottom + TOOLTIP_GAP;
        }

        const maxLeft = window.innerWidth - tooltipRect.width - VIEWPORT_PADDING;
        left = Math.max(VIEWPORT_PADDING, Math.min(left, maxLeft));

        const maxTop = window.innerHeight - tooltipRect.height - VIEWPORT_PADDING;
        top = Math.max(VIEWPORT_PADDING, Math.min(top, maxTop));

        setTooltipStyle({
            position: 'fixed',
            top,
            left,
            visibility: 'visible',
        });
    }, []);

    useLayoutEffect(() => {
        if (!isVisible) {
            return;
        }

        updatePosition();

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isVisible, content, updatePosition]);

    const clearShowTimeout = useCallback(() => {
        if (showTimeoutRef.current !== null) {
            clearTimeout(showTimeoutRef.current);
            showTimeoutRef.current = null;
        }
    }, []);

    const showTooltip = useCallback(() => {
        clearShowTimeout();
        setIsVisible(true);
    }, [clearShowTimeout]);

    const startShowDelay = useCallback(() => {
        clearShowTimeout();
        showTimeoutRef.current = setTimeout(() => {
            showTimeoutRef.current = null;
            setIsVisible(true);
        }, delayMs);
    }, [clearShowTimeout, delayMs]);

    const hideTooltip = useCallback(() => {
        clearShowTimeout();
        setIsVisible(false);
        setTooltipStyle({ visibility: 'hidden' });
    }, [clearShowTimeout]);

    const handleMouseEnter = useCallback(() => {
        startShowDelay();
    }, [startShowDelay]);

    useEffect(() => clearShowTimeout, [clearShowTimeout]);

    const tooltip = isVisible
        ? createPortal(
            <span
                ref={tooltipRef}
                role="tooltip"
                style={tooltipStyle}
                className="pointer-events-none fixed z-50 whitespace-nowrap rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 shadow-lg"
            >
                {content}
            </span>,
            document.body,
        )
        : null;

    return (
        <span
            ref={triggerRef}
            className="relative inline-flex"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    hideTooltip();
                }
            }}
        >
            {children}
            {tooltip}
        </span>
    );
}
