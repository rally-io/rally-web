import { describe, expect, it } from 'vitest';
import { tvGridCols } from '../components/GroupsView';

/**
 * Pins the "never more than two rows" rule. jsdom does no layout, so this cannot see a clipped
 * card — it can only keep the column count from drifting back to the value that produced one.
 * The measurements behind each expectation live in the doc comment on `tvGridCols`.
 */
describe('tvGridCols', () => {
    it('gives a lone group a centred single column', () => {
        expect(tvGridCols(1)).toContain('grid-cols-1');
    });

    it('lays two and four groups out two across', () => {
        expect(tvGridCols(2)).toBe('grid-cols-2');
        expect(tvGridCols(4)).toBe('grid-cols-2');
    });

    it('lays three, five and six groups out three across', () => {
        expect(tvGridCols(3)).toBe('grid-cols-3');
        expect(tvGridCols(5)).toBe('grid-cols-3');
        expect(tvGridCols(6)).toBe('grid-cols-3');
    });

    it('lays seven and eight groups out four across, so they stay within two rows', () => {
        // Eight groups at three across is three rows: each card got 193px against the ~275px a
        // four-pair table needs, and shipped showing two pairs per group on a venue screen.
        expect(tvGridCols(7)).toBe('grid-cols-4');
        expect(tvGridCols(8)).toBe('grid-cols-4');
    });

    it('returns a literal utility class, never one assembled from the count', () => {
        // Tailwind v4 only emits classes it finds written out in source; a runtime
        // `grid-cols-${n}` is silently absent and the grid collapses to one column.
        for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
            expect(['grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4']).toContain(
                tvGridCols(n).split(' ').find(c => c.startsWith('grid-cols-')),
            );
        }
    });
});
