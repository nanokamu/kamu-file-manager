export function resolveNavigationIndex<T extends { id: string }>(
    items: T[],
    focusedId: string | null,
    selectedFiles: string[],
): number {
    if (items.length === 0) {
        return -1;
    }
    if (focusedId) {
        const index = items.findIndex((item) => item.id === focusedId);
        if (index !== -1) {
            return index;
        }
    }
    if (selectedFiles.length > 0) {
        const lastSelectedId = selectedFiles[selectedFiles.length - 1];
        const index = items.findIndex((item) => item.id === lastSelectedId);
        if (index !== -1) {
            return index;
        }
    }
    return -1;
}
