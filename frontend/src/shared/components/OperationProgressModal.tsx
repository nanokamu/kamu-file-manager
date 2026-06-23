import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    isOperationActive,
    OPERATION_LABELS,
    type OperationKind,
    type OperationProgressItem,
} from '../types/operation-progress';

interface OperationProgressModalProps {
    isOpen: boolean;
    operation: OperationKind;
    items: OperationProgressItem[];
    onClose: () => void;
    autoCloseOnComplete?: boolean;
    theme?: 'light' | 'dark';
}

export function OperationProgressModal({
    isOpen,
    operation,
    items,
    onClose,
    autoCloseOnComplete = false,
    theme = 'light',
}: OperationProgressModalProps) {
    const labels = OPERATION_LABELS[operation];
    const isActive = isOperationActive(items);

    const overallProgress = useMemo(() => {
        if (items.length === 0) {
            return 0;
        }

        const total = items.reduce((sum, item) => sum + item.progress, 0);
        return Math.round(total / items.length);
    }, [items]);

    const completedCount = items.filter((item) => item.status === 'completed').length;
    const failedCount = items.filter((item) => item.status === 'failed').length;

    useEffect(() => {
        if (!isOpen || isActive) {
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
    }, [isOpen, isActive, onClose]);

    useEffect(() => {
        if (!isOpen || !autoCloseOnComplete || isActive || failedCount > 0 || completedCount === 0) {
            return;
        }

        const timer = window.setTimeout(onClose, 1000);

        return () => {
            window.clearTimeout(timer);
        };
    }, [isOpen, autoCloseOnComplete, isActive, failedCount, completedCount, onClose]);

    if (!isOpen) {
        return null;
    }

    const handleBackdropClick = (event: React.MouseEvent) => {
        if (event.target === event.currentTarget && !isActive) {
            onClose();
        }
    };

    const subtitle = isActive
        ? labels.subtitleActive(items.length)
        : failedCount > 0
            ? labels.subtitlePartialFailure(completedCount, failedCount)
            : failedCount === items.length && items.length > 0
                ? labels.subtitleFailed
                : labels.subtitleSuccess(completedCount);

    return createPortal(
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors bg-slate-900/40 dark:bg-black/60 ${theme === 'dark' ? 'dark' : ''
                }`}
            onMouseDown={handleBackdropClick}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="operation-progress-title"
                className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-200/60 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40"
            >
                <h2 id="operation-progress-title" className="text-lg font-medium !text-slate-900 dark:!text-slate-100">
                    {labels.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {subtitle}
                </p>

                <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Overall progress</span>
                        <span>{overallProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-200 dark:bg-blue-500"
                            style={{ width: `${overallProgress}%` }}
                        />
                    </div>
                </div>

                <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto">
                    {items.map((item) => (
                        <li key={item.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/60 dark:bg-slate-800/40">
                            <div className="flex items-start justify-between gap-3">
                                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{item.label}</p>
                                <span
                                    className={`shrink-0 text-xs font-medium ${item.status === 'failed'
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : item.status === 'completed'
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                >
                                    {labels.itemStatus[item.status]}
                                </span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                <div
                                    className={`h-full rounded-full transition-all duration-200 ${item.status === 'failed' ? 'bg-rose-500 dark:bg-rose-600' : 'bg-blue-500'
                                        }`}
                                    style={{ width: `${item.progress}%` }}
                                />
                            </div>
                            {item.error && (
                                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{item.error}</p>
                            )}
                        </li>
                    ))}
                </ul>

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isActive}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-500/10 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600 dark:shadow-blue-900/20"
                    >
                        {isActive ? labels.closeActive : labels.closeIdle}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
