import { describe, expect, it } from 'vitest';
import type { UnifiedResource } from '../../../api/types';
import { areFileListsEqual } from './file-list-compare.util';

function makeResource(overrides: Partial<UnifiedResource> & Pick<UnifiedResource, 'path' | 'name'>): UnifiedResource {
    return {
        type: 'file',
        updatedAt: '2026-06-01T10:00:00.000Z',
        size: 100,
        ...overrides,
    };
}

describe('areFileListsEqual', () => {
    const fileA = makeResource({ path: '/a.txt', name: 'a.txt' });
    const fileB = makeResource({ path: '/b.txt', name: 'b.txt', size: 200 });

    it('returns true for identical lists', () => {
        expect(areFileListsEqual([fileA, fileB], [fileA, fileB])).toBe(true);
    });

    it('returns true when only order differs', () => {
        expect(areFileListsEqual([fileA, fileB], [fileB, fileA])).toBe(true);
    });

    it('returns false when a file is added', () => {
        const fileC = makeResource({ path: '/c.txt', name: 'c.txt' });
        expect(areFileListsEqual([fileA, fileB], [fileA, fileB, fileC])).toBe(false);
    });

    it('returns false when a file is removed', () => {
        expect(areFileListsEqual([fileA, fileB], [fileA])).toBe(false);
    });

    it('returns false when a file is renamed', () => {
        const renamed = makeResource({ path: '/a.txt', name: 'renamed.txt' });
        expect(areFileListsEqual([fileA], [renamed])).toBe(false);
    });

    it('returns false when size changes', () => {
        const changed = makeResource({ path: '/a.txt', name: 'a.txt', size: 999 });
        expect(areFileListsEqual([fileA], [changed])).toBe(false);
    });

    it('returns false when updatedAt changes', () => {
        const changed = makeResource({
            path: '/a.txt',
            name: 'a.txt',
            updatedAt: '2026-06-02T10:00:00.000Z',
        });
        expect(areFileListsEqual([fileA], [changed])).toBe(false);
    });

    it('returns false when type changes', () => {
        const asDirectory = makeResource({
            path: '/a.txt',
            name: 'a.txt',
            type: 'directory',
            size: undefined,
        });
        expect(areFileListsEqual([fileA], [asDirectory])).toBe(false);
    });

    it('returns true for two empty lists', () => {
        expect(areFileListsEqual([], [])).toBe(true);
    });
});
