import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

interface MessageBoxModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    okLabel?: string;
    variant?: 'default' | 'error';
}

const focusRingClass =
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600';

export function MessageBoxModal({
    isOpen,
    onClose,
    title,
    description,
    okLabel = 'OK',
    variant = 'default',
}: MessageBoxModalProps) {
    const titleId = useId();
    const okRef = useRef<HTMLButtonElement>(null);
    const ignoreEnterRef = useRef(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        okRef.current?.focus();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        ignoreEnterRef.current = true;
        const frameId = requestAnimationFrame(() => {
            ignoreEnterRef.current = false;
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Enter' && ignoreEnterRef.current) {
                return;
            }
            if (event.key === 'Escape' || event.key === 'Enter') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            cancelAnimationFrame(frameId);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    const handleBackdropClick = (event: React.MouseEvent) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    const okButtonClass =
        variant === 'error'
            ? `rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-rose-500/10 transition-colors hover:bg-rose-700 ${focusRingClass}`
            : `rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-500/10 transition-colors hover:bg-blue-700 ${focusRingClass}`;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            onMouseDown={handleBackdropClick}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/60"
            >
                <h2 id={titleId} className="text-lg font-medium text-slate-900">
                    {title}
                </h2>
                {description && (
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-500">
                        {description}
                    </p>
                )}
                <div className="mt-6 flex justify-end">
                    <button
                        ref={okRef}
                        type="button"
                        onClick={onClose}
                        className={okButtonClass}
                    >
                        {okLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
