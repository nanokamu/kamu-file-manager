import { describe, expect, it } from 'vitest';
import { getRangeIds } from './file-selection.util';

describe('getRangeIds', () => {
    const items = [
        { id: 'a' },
        { id: 'b' },
        { id: 'c' },
        { id: 'd' },
    ];

    it('returns ids between start and end inclusive', () => {
        expect(getRangeIds(items, 'b', 'd')).toEqual(['b', 'c', 'd']);
    });

    it('works when end is before start', () => {
        expect(getRangeIds(items, 'd', 'b')).toEqual(['b', 'c', 'd']);
    });

    it('returns empty array when id is missing', () => {
        expect(getRangeIds(items, 'b', 'z')).toEqual([]);
    });
});
