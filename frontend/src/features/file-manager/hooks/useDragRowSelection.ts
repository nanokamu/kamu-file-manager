import { useCallback, useEffect, useRef, useState } from 'react';

const DRAG_THRESHOLD_PX = 5;

export interface SelectionBox {
    left: number;
    top: number;
    width: number;
    height: number;
}

interface DragModifiers {
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
}

type DragMode = 'range' | 'marquee';

interface PendingDrag {
    mode: DragMode;
    startId: string | null;
    x: number;
    y: number;
    modifiers: DragModifiers;
    startedOnEmpty: boolean;
}

interface UseDragRowSelectionOptions {
    items: { id: string }[];
    onRangeSelect: (startId: string, endId: string, modifiers: DragModifiers) => void;
    onMarqueeSelect: (ids: string[], modifiers: DragModifiers) => void;
    onDragEnd: (anchorId: string) => void;
    onEmptyAreaClick: () => void;
}

function rectsIntersect(a: DOMRect, box: SelectionBox): boolean {
    const boxRight = box.left + box.width;
    const boxBottom = box.top + box.height;
    return (
        a.left < boxRight &&
        a.right > box.left &&
        a.top < boxBottom &&
        a.bottom > box.top
    );
}

function suppressDragEndClick(cleanupRef: { current: (() => void) | null }) {
    cleanupRef.current?.();

    const preventDragClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        teardown();
    };

    const teardown = () => {
        document.removeEventListener('click', preventDragClick, true);
        clearTimeout(timeoutId);
        if (cleanupRef.current === teardown) {
            cleanupRef.current = null;
        }
    };

    document.addEventListener('click', preventDragClick, true);
    const timeoutId = setTimeout(teardown, 0);
    cleanupRef.current = teardown;
}

export function useDragRowSelection({
    items,
    onRangeSelect,
    onMarqueeSelect,
    onDragEnd,
    onEmptyAreaClick,
}: UseDragRowSelectionOptions) {
    const containerRef = useRef<HTMLDivElement>(null);
    const pendingRef = useRef<PendingDrag | null>(null);
    const isDraggingRef = useRef(false);
    const marqueeIntersectedRef = useRef<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

    const onRangeSelectRef = useRef(onRangeSelect);
    const onMarqueeSelectRef = useRef(onMarqueeSelect);
    const onDragEndRef = useRef(onDragEnd);
    const onEmptyAreaClickRef = useRef(onEmptyAreaClick);
    onRangeSelectRef.current = onRangeSelect;
    onMarqueeSelectRef.current = onMarqueeSelect;
    onDragEndRef.current = onDragEnd;
    onEmptyAreaClickRef.current = onEmptyAreaClick;

    const cleanupListenersRef = useRef<(() => void) | null>(null);
    const suppressClickCleanupRef = useRef<(() => void) | null>(null);

    const cleanupListeners = useCallback(() => {
        cleanupListenersRef.current?.();
        cleanupListenersRef.current = null;
    }, []);

    const attachDocumentListeners = useCallback(
        (handleMouseMove: (e: MouseEvent) => void, handleMouseUp: () => void) => {
            cleanupListeners();
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            cleanupListenersRef.current = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        },
        [cleanupListeners],
    );

    useEffect(() => {
        return () => {
            cleanupListeners();
            suppressClickCleanupRef.current?.();
            pendingRef.current = null;
            isDraggingRef.current = false;
            marqueeIntersectedRef.current = [];
            setSelectionBox(null);
        };
    }, [cleanupListeners]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const pending = pendingRef.current;
        if (!pending) return;

        const dx = e.clientX - pending.x;
        const dy = e.clientY - pending.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (!isDraggingRef.current && distance < DRAG_THRESHOLD_PX) return;

        if (!isDraggingRef.current) {
            isDraggingRef.current = true;
            setIsDragging(true);
        }

        const left = Math.min(pending.x, e.clientX);
        const top = Math.min(pending.y, e.clientY);
        const box: SelectionBox = {
            left,
            top,
            width: Math.abs(e.clientX - pending.x),
            height: Math.abs(e.clientY - pending.y),
        };
        setSelectionBox(box);

        if (pending.mode === 'range' && pending.startId) {
            const el = document.elementFromPoint(e.clientX, e.clientY);
            const row = el?.closest('[data-file-row-id]') as HTMLElement | null;
            const hoveredId = row?.dataset.fileRowId;
            if (hoveredId) {
                onRangeSelectRef.current(pending.startId, hoveredId, pending.modifiers);
            }
        } else if (pending.mode === 'marquee') {
            const container = containerRef.current;
            if (!container) return;

            const intersectingIds: string[] = [];
            container.querySelectorAll('[data-file-row-id]').forEach((rowEl) => {
                const row = rowEl as HTMLElement;
                const id = row.dataset.fileRowId;
                if (!id) return;
                if (rectsIntersect(row.getBoundingClientRect(), box)) {
                    intersectingIds.push(id);
                }
            });
            marqueeIntersectedRef.current = intersectingIds;
            if (intersectingIds.length > 0) {
                onMarqueeSelectRef.current(intersectingIds, pending.modifiers);
            }
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        const pending = pendingRef.current;
        const didDrag = isDraggingRef.current;

        if (didDrag && pending) {
            if (pending.mode === 'range' && pending.startId) {
                onDragEndRef.current(pending.startId);
            } else if (pending.mode === 'marquee') {
                const intersecting = marqueeIntersectedRef.current;
                if (intersecting.length > 0) {
                    onDragEndRef.current(intersecting[intersecting.length - 1]);
                }
            }
            suppressDragEndClick(suppressClickCleanupRef);
        } else if (!didDrag && pending?.startedOnEmpty) {
            onEmptyAreaClickRef.current();
        } else if (
            didDrag &&
            pending?.mode === 'marquee' &&
            pending.startedOnEmpty &&
            marqueeIntersectedRef.current.length === 0
        ) {
            onEmptyAreaClickRef.current();
        }

        pendingRef.current = null;
        isDraggingRef.current = false;
        marqueeIntersectedRef.current = [];
        setIsDragging(false);
        setSelectionBox(null);
        cleanupListeners();
    }, [cleanupListeners]);

    const startPendingDrag = useCallback(
        (pending: PendingDrag) => {
            pendingRef.current = pending;
            marqueeIntersectedRef.current = [];
            attachDocumentListeners(handleMouseMove, handleMouseUp);
        },
        [attachDocumentListeners, handleMouseMove, handleMouseUp],
    );

    const getContainerProps = useCallback(
        () => ({
            ref: containerRef,
            onMouseDownCapture: (e: React.MouseEvent) => {
                if (e.button !== 0) return;
                const target = e.target as HTMLElement;
                if (target.closest('[data-file-row-id]') || target.closest('[data-file-row-actions]')) {
                    return;
                }

                startPendingDrag({
                    mode: 'marquee',
                    startId: null,
                    x: e.clientX,
                    y: e.clientY,
                    modifiers: {
                        shiftKey: e.shiftKey,
                        ctrlKey: e.ctrlKey,
                        metaKey: e.metaKey,
                    },
                    startedOnEmpty: true,
                });
            },
        }),
        [startPendingDrag],
    );

    const getRowProps = useCallback(
        (id: string) => ({
            'data-file-row-id': id,
            onMouseDown: (e: React.MouseEvent) => {
                if (e.button !== 0) return;
                if ((e.target as HTMLElement).closest('[data-file-row-actions]')) return;

                startPendingDrag({
                    mode: 'range',
                    startId: id,
                    x: e.clientX,
                    y: e.clientY,
                    modifiers: {
                        shiftKey: e.shiftKey,
                        ctrlKey: e.ctrlKey,
                        metaKey: e.metaKey,
                    },
                    startedOnEmpty: false,
                });
            },
        }),
        [startPendingDrag],
    );

    void items;

    return {
        getContainerProps,
        getRowProps,
        isDragging,
        selectionBox,
    };
}
