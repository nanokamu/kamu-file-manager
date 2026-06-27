import {
    useCallback,
    useRef,
    useState,
    type KeyboardEvent,
    type MouseEvent,
    type MutableRefObject,
} from 'react';
import type { FileItem } from '../types';
import { resolveNavigationIndex } from '../utils/file-navigation.util';

interface UseFileTableKeyboardOptions {
    items: FileItem[];
    selectedFiles: string[];
    disabled?: boolean;
    isPointerSelecting?: boolean;
    anchorIdRef: MutableRefObject<string | null>;
    onNavigateSelect: (id: string, modifiers: { shiftKey: boolean }) => void;
    onToggleSelect: (id: string) => void;
    onActivate: (item: FileItem) => void;
    onSelectAll: () => void;
    onClearSelection: () => void;
    onCopy: () => void;
    onMove: () => void;
    onPaste: () => void;
    onRequestDelete: () => void;
    onRename: (item: FileItem) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    const tag = target.tagName;
    return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
    );
}

function isModifierKey(event: KeyboardEvent): boolean {
    return event.ctrlKey || event.metaKey;
}

function shouldClaimGridFocus(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    if (isEditableTarget(target)) {
        return false;
    }
    if (target.closest('[data-file-row-id]')) {
        return false;
    }
    if (target.closest('[data-file-row-actions]')) {
        return false;
    }
    return true;
}

export function useFileTableKeyboard({
    items,
    selectedFiles,
    disabled = false,
    isPointerSelecting = false,
    anchorIdRef,
    onNavigateSelect,
    onToggleSelect,
    onActivate,
    onSelectAll,
    onClearSelection,
    onCopy,
    onMove,
    onPaste,
    onRequestDelete,
    onRename,
}: UseFileTableKeyboardOptions) {
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [prevItems, setPrevItems] = useState(items);
    const [prevIsPointerSelecting, setPrevIsPointerSelecting] = useState(isPointerSelecting);
    const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
    const containerRef = useRef<HTMLDivElement>(null);

    if (items !== prevItems) {
        setPrevItems(items);
        setFocusedId(null);
    }

    if (isPointerSelecting !== prevIsPointerSelecting) {
        setPrevIsPointerSelecting(isPointerSelecting);
        if (isPointerSelecting) {
            setFocusedId(null);
        }
    }

    const activeFocusedId =
        focusedId && items.some((item) => item.id === focusedId) ? focusedId : null;

    const displayFocusedId = isPointerSelecting ? null : activeFocusedId;

    const resolveCurrentIndex = useCallback((): number => {
        return resolveNavigationIndex(items, displayFocusedId, selectedFiles);
    }, [displayFocusedId, items, selectedFiles]);

    const scrollFocusedRowIntoView = useCallback((id: string) => {
        requestAnimationFrame(() => {
            rowRefs.current.get(id)?.scrollIntoView({ block: 'nearest' });
        });
    }, []);

    const navigateToIndex = useCallback(
        (index: number, shiftKey: boolean) => {
            if (index < 0 || index >= items.length) {
                return;
            }
            const id = items[index].id;
            setFocusedId(id);
            onNavigateSelect(id, { shiftKey });
            requestAnimationFrame(() => {
                rowRefs.current.get(id)?.focus();
            });
            scrollFocusedRowIntoView(id);
        },
        [items, onNavigateSelect, scrollFocusedRowIntoView],
    );

    const focusRow = useCallback((id: string) => {
        if (!items.some((item) => item.id === id)) {
            return;
        }
        setFocusedId(id);
        requestAnimationFrame(() => {
            rowRefs.current.get(id)?.focus();
        });
        scrollFocusedRowIntoView(id);
    }, [items, scrollFocusedRowIntoView]);

    const syncFocusToSelection = useCallback((id: string | null) => {
        if (!id || !items.some((item) => item.id === id)) {
            setFocusedId(null);
            containerRef.current?.focus();
            return;
        }
        setFocusedId(id);
        requestAnimationFrame(() => {
            rowRefs.current.get(id)?.focus();
        });
        scrollFocusedRowIntoView(id);
    }, [items, scrollFocusedRowIntoView]);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLElement>) => {
            if (disabled || isEditableTarget(event.target)) {
                return;
            }

            const { key, shiftKey } = event;
            const modifier = isModifierKey(event);

            if (modifier && key.toLowerCase() === 'a') {
                if (items.length === 0) {
                    return;
                }
                event.preventDefault();
                onSelectAll();
                const lastId = items[items.length - 1].id;
                setFocusedId(lastId);
                anchorIdRef.current = lastId;
                requestAnimationFrame(() => {
                    rowRefs.current.get(lastId)?.focus();
                });
                scrollFocusedRowIntoView(lastId);
                return;
            }

            if (modifier && key.toLowerCase() === 'c') {
                if (selectedFiles.length === 0) {
                    return;
                }
                event.preventDefault();
                onCopy();
                return;
            }

            if (modifier && key.toLowerCase() === 'x') {
                if (selectedFiles.length === 0) {
                    return;
                }
                event.preventDefault();
                onMove();
                return;
            }

            if (modifier && key.toLowerCase() === 'v') {
                event.preventDefault();
                onPaste();
                return;
            }

            if (key === 'Escape') {
                event.preventDefault();
                setFocusedId(null);
                onClearSelection();
                containerRef.current?.focus();
                return;
            }

            if ((key === 'Delete' || key === 'Backspace') && selectedFiles.length > 0) {
                event.preventDefault();
                onRequestDelete();
                return;
            }

            if (key === 'F2' && selectedFiles.length === 1) {
                const item = items.find((entry) => entry.id === selectedFiles[0]);
                if (item) {
                    event.preventDefault();
                    onRename(item);
                }
                return;
            }

            if (key === ' ') {
                const targetId = displayFocusedId ?? selectedFiles[selectedFiles.length - 1];
                if (!targetId) {
                    return;
                }
                event.preventDefault();
                onToggleSelect(targetId);
                setFocusedId(targetId);
                anchorIdRef.current = targetId;
                return;
            }

            if (key === 'Enter') {
                const targetId = displayFocusedId ?? selectedFiles[selectedFiles.length - 1];
                const item = items.find((entry) => entry.id === targetId);
                if (!item) {
                    return;
                }
                event.preventDefault();
                onActivate(item);
                return;
            }

            let nextIndex: number | null = null;
            const currentIndex = resolveCurrentIndex();

            if (key === 'ArrowDown') {
                nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, items.length - 1);
            } else if (key === 'ArrowUp') {
                nextIndex = currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0);
            } else if (key === 'Home') {
                nextIndex = 0;
            } else if (key === 'End') {
                nextIndex = items.length - 1;
            }

            if (nextIndex === null || nextIndex < 0 || items.length === 0) {
                return;
            }

            event.preventDefault();
            navigateToIndex(nextIndex, shiftKey);
        },
        [
            displayFocusedId,
            anchorIdRef,
            disabled,
            items,
            navigateToIndex,
            onActivate,
            onClearSelection,
            onCopy,
            onMove,
            onPaste,
            onRename,
            onRequestDelete,
            onSelectAll,
            onToggleSelect,
            resolveCurrentIndex,
            scrollFocusedRowIntoView,
            selectedFiles,
        ],
    );

    const getContainerProps = useCallback(
        () => ({
            ref: containerRef,
            tabIndex: 0,
            role: 'grid' as const,
            'aria-multiselectable': true,
            onKeyDown: handleKeyDown,
            onMouseDown: (event: MouseEvent) => {
                if (shouldClaimGridFocus(event.target)) {
                    containerRef.current?.focus();
                }
            },
        }),
        [handleKeyDown],
    );

    const getKeyboardRowProps = useCallback(
        (id: string) => {
            const isSelected = selectedFiles.includes(id);
            return {
                role: 'row' as const,
                tabIndex: displayFocusedId === id ? 0 : -1,
                'aria-selected': isSelected,
                'aria-label': items.find((item) => item.id === id)?.name,
                onFocus: () => setFocusedId(id),
                onKeyDown: handleKeyDown,
                ref: (node: HTMLTableRowElement | null) => {
                    if (node) {
                        rowRefs.current.set(id, node);
                    } else {
                        rowRefs.current.delete(id);
                    }
                },
            };
        },
        [displayFocusedId, handleKeyDown, items, selectedFiles],
    );

    return {
        focusedId: displayFocusedId,
        focusRow,
        syncFocusToSelection,
        getContainerProps,
        getKeyboardRowProps,
    };
}
