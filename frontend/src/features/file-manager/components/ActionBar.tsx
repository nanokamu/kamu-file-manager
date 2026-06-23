import React, { useRef, useState } from 'react';
import { ConfirmModal } from '../../../shared/components/ConfirmModal';
import { Tooltip } from '../../../shared/components/Tooltip';

interface ActionBarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedCount: number;
    clipboardCount?: number;
    onClearSelection?: () => void;
    onClearClipboard?: () => void;
    onCopy?: () => void;
    onMove?: () => void;
    onPaste?: () => void;
    onDelete?: () => void;
    onNewFolder?: () => void;
    onUpload?: (files: File[]) => void;
}

const iconButtonBase =
    'p-2 rounded-lg transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20';

const secondaryButtonClass = `${iconButtonBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
const deleteButtonClass = `${iconButtonBase} bg-rose-50 text-rose-600 hover:bg-rose-100`;
const pasteButtonClass = `${iconButtonBase} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`;
const uploadButtonClass = `${iconButtonBase} bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/10`;

function IconActionButton({
    label,
    onClick,
    className,
    children,
}: {
    label: string;
    onClick?: () => void;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <Tooltip content={label}>
            <button
                type="button"
                aria-label={label}
                onClick={onClick}
                className={className}
            >
                {children}
            </button>
        </Tooltip>
    );
}

export function ActionBar({
    searchQuery,
    setSearchQuery,
    selectedCount,
    clipboardCount = 0,
    onClearSelection,
    onClearClipboard,
    onCopy,
    onMove,
    onPaste,
    onDelete,
    onNewFolder,
    onUpload,
}: ActionBarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            onUpload?.(Array.from(selectedFiles));
        }
        event.target.value = '';
    };

    const handleDeleteConfirm = () => {
        onDelete?.();
        setIsDeleteConfirmOpen(false);
    };

    const deleteTitle = `Delete ${selectedCount} item${selectedCount === 1 ? '' : 's'}?`;
    const deleteDescription = `This action cannot be undone. The selected item${selectedCount === 1 ? '' : 's'} will be permanently deleted.`;
    const deleteLabel = `Delete (${selectedCount})`;
    const pasteLabel = clipboardCount > 0 ? `Paste (${clipboardCount})` : 'Paste';

    return (
        <div className="px-4 py-2.5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
            />
            <div className="relative w-full sm:w-72">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </span>
                <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <div className="flex items-center gap-2 justify-end">
                    {selectedCount > 0 && (
                        <>
                            <IconActionButton label="Copy" onClick={onCopy} className={secondaryButtonClass}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </IconActionButton>
                            <IconActionButton label="Move" onClick={onMove} className={secondaryButtonClass}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                            </IconActionButton>
                        </>
                    )}
                    {(selectedCount > 0 || clipboardCount > 0) && (
                        <IconActionButton
                            label="Cancel"
                            onClick={() => {
                                onClearClipboard?.();
                                onClearSelection?.();
                            }}
                            className={secondaryButtonClass}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </IconActionButton>
                    )}
                    {selectedCount > 0 && (
                        <IconActionButton
                            label={deleteLabel}
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            className={deleteButtonClass}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </IconActionButton>
                    )}
                    {clipboardCount > 0 && (
                        <IconActionButton label={pasteLabel} onClick={onPaste} className={pasteButtonClass}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </IconActionButton>
                    )}
                    <IconActionButton label="New Folder" onClick={onNewFolder} className={secondaryButtonClass}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                    </IconActionButton>
                    <IconActionButton label="Upload" onClick={handleUploadClick} className={uploadButtonClass}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </IconActionButton>
                </div>
            </div>

            <ConfirmModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleDeleteConfirm}
                title={deleteTitle}
                description={deleteDescription}
                confirmLabel="Delete"
                variant="danger"
                initialFocus="cancel"
            />
        </div>
    );
}
