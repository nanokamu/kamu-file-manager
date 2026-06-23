import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'primary';
    isLoading?: boolean;
    initialFocus?: 'cancel' | 'confirm';
}

// const focusRingClass =
//     'focus:outline-none focus:ring-2 focus:ring-blue-500/20';

const focusRingClass =
    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600";

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'primary',
    isLoading = false,
    initialFocus = 'confirm',
}: ConfirmModalProps) {
    const titleId = useId();
    const cancelRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen || isLoading) {
            return;
        }

        const target = initialFocus === 'cancel' ? cancelRef : confirmRef;
        target.current?.focus();
    }, [isOpen, isLoading, initialFocus]);

    useEffect(() => {
        if (!isOpen || isLoading) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
                return;
            }

            if (event.key === 'ArrowLeft') {
                if (document.activeElement === cancelRef.current) {
                    return;
                }
                event.preventDefault();
                cancelRef.current?.focus();
                return;
            }

            if (event.key === 'ArrowRight') {
                if (document.activeElement === confirmRef.current) {
                    return;
                }
                event.preventDefault();
                confirmRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, isLoading, onClose]);

    if (!isOpen) {
        return null;
    }

    const handleBackdropClick = (event: React.MouseEvent) => {
        if (event.target === event.currentTarget && !isLoading) {
            onClose();
        }
    };

    const confirmButtonClass =
        variant === 'danger'
            ? `rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-rose-500/10 transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRingClass}`
            : `rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-500/10 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRingClass}`;

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
                    <p className="mt-1 text-sm text-slate-500">
                        {description}
                    </p>
                )}
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        ref={cancelRef}
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className={`rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 ${focusRingClass}`}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        onClick={() => void onConfirm()}
                        disabled={isLoading}
                        className={confirmButtonClass}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
