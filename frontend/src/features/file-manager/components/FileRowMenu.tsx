import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FileItem } from '../types';

interface FileRowMenuProps {
    item: FileItem;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    onOpenInEditor?: (item: FileItem) => void;
    onDownload?: (item: FileItem) => void;
    onDownloadFolderAsZip?: (item: FileItem) => void;
    onRename?: (item: FileItem) => void;
}

interface MenuPosition {
    top: number;
    left: number;
    openUpward: boolean;
}

const EDITABLE_TYPES = new Set<FileItem['type']>(['document']);

export function FileRowMenu({
    item,
    isOpen,
    onToggle,
    onClose,
    onOpenInEditor,
    onDownload,
    onDownloadFolderAsZip,
    onRename,
}: FileRowMenuProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
    const isFolder = item.type === 'folder';
    const canOpenInEditor = !isFolder && EDITABLE_TYPES.has(item.type);
    const canDownload = !isFolder;
    const canDownloadFolderAsZip = isFolder;

    useLayoutEffect(() => {
        if (!isOpen || !buttonRef.current) {
            setMenuPosition(null);
            return;
        }

        const updatePosition = () => {
            const button = buttonRef.current;
            if (!button) {
                return;
            }

            const rect = button.getBoundingClientRect();
            const estimatedMenuHeight = 140;
            const spaceBelow = window.innerHeight - rect.bottom;
            const openUpward = spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight;

            setMenuPosition({
                top: openUpward ? rect.top - 4 : rect.bottom + 4,
                left: rect.right,
                openUpward,
            });
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                buttonRef.current?.contains(target) ||
                menuRef.current?.contains(target)
            ) {
                return;
            }
            onClose();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!canOpenInEditor && !canDownload && !canDownloadFolderAsZip && !onRename) {
        return null;
    }

    const menuPanel = isOpen && menuPosition && (
        <div
            ref={menuRef}
            role="menu"
            style={{
                position: 'fixed',
                top: menuPosition.top,
                left: menuPosition.left,
                transform: menuPosition.openUpward ? 'translate(-100%, -100%)' : 'translateX(-100%)',
                zIndex: 50,
            }}
            className="min-w-[11rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/60"
        >
            {canOpenInEditor && onOpenInEditor && (
                <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                        onOpenInEditor(item);
                        onClose();
                    }}
                    className="w-max min-w-[11rem] flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                    <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Open With Code Editor
                </button>
            )}
            {onRename && (
                <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                        onRename(item);
                        onClose();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                    <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Rename
                </button>
            )}
            {canDownload && onDownload && (
                <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                        onDownload(item);
                        onClose();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                    <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                    </svg>
                    Download
                </button>
            )}
            {canDownloadFolderAsZip && onDownloadFolderAsZip && (
                <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                        onDownloadFolderAsZip(item);
                        onClose();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                    <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                    </svg>
                    Download as ZIP
                </button>
            )}
        </div>
    );

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={`Actions for ${item.name}`}
                onClick={onToggle}
                className={`p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all ${isOpen ? 'opacity-100 bg-slate-100 text-slate-600' : 'opacity-0 group-hover:opacity-100'}`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
            </button>
            {menuPanel && createPortal(menuPanel, document.body)}
        </>
    );
}
