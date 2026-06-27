import { describe, expect, it } from 'vitest';
import { resolveNavigationIndex } from './file-navigation.util';

describe('resolveNavigationIndex', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

    it('returns -1 for an empty list', () => {
        expect(resolveNavigationIndex([], null, [])).toBe(-1);
    });

    it('prefers the focused row when present', () => {
        expect(resolveNavigationIndex(items, 'c', ['a'])).toBe(2);
    });

    it('falls back to the last selected row when focus is missing', () => {
        expect(resolveNavigationIndex(items, null, ['a', 'b'])).toBe(1);
    });

    it('falls back to index 0 when focus and selection are absent', () => {
        expect(resolveNavigationIndex(items, null, [])).toBe(0);
    });

    it('ignores stale focused or selected ids', () => {
        expect(resolveNavigationIndex(items, 'z', ['y'])).toBe(0);
    });
});
