import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TextInputDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (value: string) => Promise<boolean>;
    title: string;
    description?: string;
    placeholder?: string;
    initialValue?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    submittingLabel?: string;
    selectAllOnFocus?: boolean;
}

export function TextInputDialog({
    isOpen,
    onClose,
    onSubmit,
    title,
    description,
    placeholder,
    initialValue = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    submittingLabel,
    selectAllOnFocus = false,
}: TextInputDialogProps) {
    const [value, setValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const titleId = useId();

    useEffect(() => {
        if (!isOpen) {
            setValue('');
            setIsSubmitting(false);
            return;
        }

        setValue(initialValue);
        setIsSubmitting(false);
        inputRef.current?.focus();
        if (selectAllOnFocus) {
            inputRef.current?.select();
        }
    }, [isOpen, initialValue, selectAllOnFocus]);

    useEffect(() => {
        if (!isOpen || isSubmitting) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, isSubmitting, onClose]);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = async () => {
        if (!value.trim() || isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await onSubmit(value);
            if (success) {
                onClose();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackdropClick = (event: React.MouseEvent) => {
        if (event.target === event.currentTarget && !isSubmitting) {
            onClose();
        }
    };

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
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleSubmit();
                        }
                    }}
                    placeholder={placeholder}
                    disabled={isSubmitting}
                    className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                />
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={!value.trim() || isSubmitting}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-500/10 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? (submittingLabel ?? confirmLabel) : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
