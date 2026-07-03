import { useCallback, useRef, useState } from 'react';

interface UseFileDropUploadOptions {
    onUpload: (files: File[]) => void;
    disabled?: boolean;
}

function hasFileTransfer(dataTransfer: DataTransfer): boolean {
    return [...dataTransfer.types].includes('Files');
}

export function useFileDropUpload({ onUpload, disabled = false }: UseFileDropUploadOptions) {
    const dragCounterRef = useRef(0);
    const [isFileDragOver, setIsFileDragOver] = useState(false);

    const resetDragState = useCallback(() => {
        dragCounterRef.current = 0;
        setIsFileDragOver(false);
    }, []);

    const onDragEnter = useCallback(
        (event: React.DragEvent) => {
            if (disabled || !hasFileTransfer(event.dataTransfer)) {
                return;
            }

            event.preventDefault();
            dragCounterRef.current += 1;
            setIsFileDragOver(true);
        },
        [disabled],
    );

    const onDragLeave = useCallback(
        (event: React.DragEvent) => {
            if (disabled || !hasFileTransfer(event.dataTransfer)) {
                return;
            }

            event.preventDefault();
            dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
            if (dragCounterRef.current === 0) {
                setIsFileDragOver(false);
            }
        },
        [disabled],
    );

    const onDragOver = useCallback(
        (event: React.DragEvent) => {
            if (disabled || !hasFileTransfer(event.dataTransfer)) {
                return;
            }

            event.preventDefault();
        },
        [disabled],
    );

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            if (disabled || !hasFileTransfer(event.dataTransfer)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            resetDragState();

            const files = Array.from(event.dataTransfer.files);
            if (files.length > 0) {
                onUpload(files);
            }
        },
        [disabled, onUpload, resetDragState],
    );

    return {
        isFileDragOver,
        dropZoneProps: {
            onDragEnter,
            onDragLeave,
            onDragOver,
            onDrop,
        },
    };
}
