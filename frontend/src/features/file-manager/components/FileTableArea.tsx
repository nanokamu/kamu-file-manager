import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import type { FileItem } from '../types';
import { useDragRowSelection } from '../hooks/useDragRowSelection';
import { useFileTableKeyboard } from '../hooks/useFileTableKeyboard';
import { DragSelectionBox } from './DragSelectionBox';
import { FileTable } from './FileTable';

interface DragModifiers {
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
}

interface FileTableAreaProps {
    items: FileItem[];
    selectedFiles: string[];
    openMenuId: string | null;
    anchorIdRef: MutableRefObject<string | null>;
    keyboardDisabled?: boolean;
    onRowClick: (item: FileItem) => void;
    onToggleSelect: (id: string, e: React.MouseEvent) => void;
    onRangeSelect: (startId: string, endId: string, modifiers: DragModifiers) => void;
    onMarqueeSelect: (ids: string[], modifiers: DragModifiers) => void;
    onDragSelectEnd: (anchorId: string) => void;
    onEmptyAreaClick: () => void;
    onKeyboardNavigate: (id: string, modifiers: { shiftKey: boolean }) => void;
    onKeyboardToggleSelect: (id: string) => void;
    onKeyboardSelectAll: () => void;
    onKeyboardClearSelection: () => void;
    onKeyboardCopy: () => void;
    onKeyboardMove: () => void;
    onKeyboardPaste: () => void;
    onKeyboardRequestDelete: () => void;
    onKeyboardRename: (item: FileItem) => void;
    onToggleMenu: (id: string) => void;
    onCloseMenu: () => void;
    onOpenInEditor?: (item: FileItem) => void;
    onDownload?: (item: FileItem) => void;
    onDownloadFolderAsZip?: (item: FileItem) => void;
    onRename?: (item: FileItem) => void;
    onUploadFiles?: (files: File[]) => void;
}

export function FileTableArea({
    items,
    selectedFiles,
    openMenuId,
    anchorIdRef,
    keyboardDisabled = false,
    onRowClick,
    onToggleSelect,
    onRangeSelect,
    onMarqueeSelect,
    onDragSelectEnd,
    onEmptyAreaClick,
    onKeyboardNavigate,
    onKeyboardToggleSelect,
    onKeyboardSelectAll,
    onKeyboardClearSelection,
    onKeyboardCopy,
    onKeyboardMove,
    onKeyboardPaste,
    onKeyboardRequestDelete,
    onKeyboardRename,
    onToggleMenu,
    onCloseMenu,
    onOpenInEditor,
    onDownload,
    onDownloadFolderAsZip,
    onRename,
    onUploadFiles,
}: FileTableAreaProps) {
    const syncFocusRef = useRef<(id: string | null) => void>(() => {});

    const handleDragEnd = useCallback(
        (anchorId: string) => {
            onDragSelectEnd(anchorId);
            syncFocusRef.current(anchorId);
        },
        [onDragSelectEnd],
    );

    const handleEmptyAreaClick = useCallback(() => {
        onEmptyAreaClick();
        syncFocusRef.current(null);
    }, [onEmptyAreaClick]);

    const {
        getContainerProps: getDragContainerProps,
        getRowProps,
        isDragging,
        selectionBox,
    } = useDragRowSelection({
        items,
        onRangeSelect,
        onMarqueeSelect,
        onDragEnd: handleDragEnd,
        onEmptyAreaClick: handleEmptyAreaClick,
    });

    const {
        focusedId,
        focusRow,
        syncFocusToSelection,
        getContainerProps: getKeyboardContainerProps,
        getKeyboardRowProps,
    } = useFileTableKeyboard({
        items,
        selectedFiles,
        disabled: keyboardDisabled,
        isPointerSelecting: isDragging,
        anchorIdRef,
        onNavigateSelect: onKeyboardNavigate,
        onToggleSelect: onKeyboardToggleSelect,
        onActivate: onRowClick,
        onSelectAll: onKeyboardSelectAll,
        onClearSelection: onKeyboardClearSelection,
        onCopy: onKeyboardCopy,
        onMove: onKeyboardMove,
        onPaste: onKeyboardPaste,
        onRequestDelete: onKeyboardRequestDelete,
        onRename: onKeyboardRename,
    });

    useEffect(() => {
        syncFocusRef.current = syncFocusToSelection;
    }, [syncFocusToSelection]);

    const dragContainerProps = getDragContainerProps();
    const keyboardContainerProps = getKeyboardContainerProps();
    const { ref: dragContainerRef, ...dragContainerRest } = dragContainerProps;
    const { ref: keyboardContainerRef, ...keyboardContainerRest } = keyboardContainerProps;

    const handleRowClick = (item: FileItem) => {
        focusRow(item.id);
        onRowClick(item);
    };

    const handleToggleSelect = useCallback(
        (id: string, e: React.MouseEvent) => {
            onToggleSelect(id, e);
            focusRow(id);
        },
        [focusRow, onToggleSelect],
    );

    return (
        <>
            <DragSelectionBox box={selectionBox} />
            <div
                {...dragContainerRest}
                {...keyboardContainerRest}
                ref={(node) => {
                    dragContainerRef.current = node;
                    keyboardContainerRef.current = node;
                }}
                className="flex-1 min-h-0 overflow-x-auto overflow-y-auto [scrollbar-gutter:stable] select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/30"
            >
                <FileTable
                    items={items}
                    selectedFiles={selectedFiles}
                    focusedId={focusedId}
                    openMenuId={openMenuId}
                    getRowProps={getRowProps}
                    getKeyboardRowProps={getKeyboardRowProps}
                    isDragging={isDragging}
                    onRowClick={handleRowClick}
                    onToggleSelect={handleToggleSelect}
                    onToggleMenu={onToggleMenu}
                    onCloseMenu={onCloseMenu}
                    onOpenInEditor={onOpenInEditor}
                    onDownload={onDownload}
                    onDownloadFolderAsZip={onDownloadFolderAsZip}
                    onRename={onRename}
                    onUploadFiles={onUploadFiles}
                />
            </div>
        </>
    );
}
