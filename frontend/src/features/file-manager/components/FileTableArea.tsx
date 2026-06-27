import type { FileItem } from '../types';
import { useDragRowSelection } from '../hooks/useDragRowSelection';
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
    onRowClick: (item: FileItem) => void;
    onToggleSelect: (id: string, e: React.MouseEvent) => void;
    onRangeSelect: (startId: string, endId: string, modifiers: DragModifiers) => void;
    onMarqueeSelect: (ids: string[], modifiers: DragModifiers) => void;
    onDragSelectEnd: (anchorId: string) => void;
    onEmptyAreaClick: () => void;
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
    onRowClick,
    onToggleSelect,
    onRangeSelect,
    onMarqueeSelect,
    onDragSelectEnd,
    onEmptyAreaClick,
    onToggleMenu,
    onCloseMenu,
    onOpenInEditor,
    onDownload,
    onDownloadFolderAsZip,
    onRename,
    onUploadFiles,
}: FileTableAreaProps) {
    const {
        getContainerProps,
        getRowProps,
        isDragging,
        selectionBox,
    } = useDragRowSelection({
        items,
        onRangeSelect,
        onMarqueeSelect,
        onDragEnd: onDragSelectEnd,
        onEmptyAreaClick,
    });

    const containerProps = getContainerProps();

    return (
        <>
            <DragSelectionBox box={selectionBox} />
            <div
                {...containerProps}
                className="flex-1 min-h-0 overflow-x-auto overflow-y-auto [scrollbar-gutter:stable] select-none"
            >
                <FileTable
                    items={items}
                    selectedFiles={selectedFiles}
                    openMenuId={openMenuId}
                    getRowProps={getRowProps}
                    isDragging={isDragging}
                    onRowClick={onRowClick}
                    onToggleSelect={onToggleSelect}
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
