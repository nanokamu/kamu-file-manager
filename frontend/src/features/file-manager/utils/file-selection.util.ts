export function getRangeIds<T extends { id: string }>(
    items: T[],
    startId: string,
    endId: string,
): string[] {
    const start = items.findIndex((i) => i.id === startId);
    const end = items.findIndex((i) => i.id === endId);
    if (start === -1 || end === -1) return [];
    const [lo, hi] = [start, end].sort((a, b) => a - b);
    return items.slice(lo, hi + 1).map((i) => i.id);
}
