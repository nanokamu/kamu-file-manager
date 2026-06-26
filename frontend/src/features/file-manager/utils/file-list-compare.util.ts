import type { UnifiedResource } from '../../../api/types';

export function areFileListsEqual(
    current: UnifiedResource[],
    next: UnifiedResource[],
): boolean {
    if (current.length !== next.length) {
        return false;
    }

    const byPath = new Map(next.map((resource) => [resource.path, resource]));

    for (const item of current) {
        const other = byPath.get(item.path);
        if (!other) {
            return false;
        }
        if (
            item.name !== other.name ||
            item.type !== other.type ||
            item.size !== other.size ||
            item.updatedAt !== other.updatedAt
        ) {
            return false;
        }
    }

    return true;
}
