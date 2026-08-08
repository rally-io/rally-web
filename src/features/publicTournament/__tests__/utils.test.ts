import { describe, expect, it } from 'vitest';
import { activeMatchIndex, groupGlyph, planBalancedPages, planPages } from '../utils';
import type { PublicMatch } from '../types';

function match(id: string, round: number | null, status = 'scheduled'): PublicMatch {
    return {
        id,
        match_label: null,
        round_number: round,
        team_a: null,
        team_b: null,
        sets: [],
        winner_team: null,
        next_match_id: null,
        status,
        court_name: null,
        scheduled_at: null,
    };
}

describe('planPages', () => {
    it('packs rows into pages that fit the budget', () => {
        // 3 rows of 100 + 10 gap: 100 + 10 + 100 = 210 fits 250; adding the third would be 320.
        expect(planPages([100, 100, 100], 250, 10)).toEqual([[0, 1], [2]]);
    });

    it('keeps everything on one page when it already fits', () => {
        expect(planPages([100, 100], 300, 10)).toEqual([[0, 1]]);
    });

    it('places an over-tall row rather than dropping it', () => {
        expect(planPages([400, 50], 100, 10).flat()).toEqual([0, 1]);
    });

    it('shows every game exactly once across all pages', () => {
        const pages = planPages([70, 90, 60, 110, 80, 70], 200, 8);
        expect(pages.flat()).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('treats an unmeasured (non-positive) budget as a single page', () => {
        expect(planPages([100, 100], 0, 10)).toEqual([[0, 1]]);
        expect(planPages([100, 100], -50, 10)).toEqual([[0, 1]]);
    });

    it('returns one empty page when a group has no games', () => {
        expect(planPages([], 200, 10)).toEqual([[]]);
    });
});

describe('planBalancedPages', () => {
    it('spreads games evenly instead of front-loading them', () => {
        // 6 rows of 100 in a 620 budget: greedy fits 5 and strands 1 on page 2.
        expect(planPages(Array(6).fill(100), 620, 10)).toEqual([[0, 1, 2, 3, 4], [5]]);
        expect(planBalancedPages(Array(6).fill(100), 620, 10)).toEqual([[0, 1, 2], [3, 4, 5]]);
    });

    it('never adds a page compared with greedy packing', () => {
        const heights = [80, 120, 60, 100, 90, 70, 110, 85, 95];
        expect(planBalancedPages(heights, 300, 8)).toHaveLength(planPages(heights, 300, 8).length);
    });

    it('leaves a single page untouched', () => {
        expect(planBalancedPages([100, 100], 600, 10)).toEqual([[0, 1]]);
    });

    it('still shows every game exactly once', () => {
        const flat = planBalancedPages([90, 70, 110, 80, 95], 260, 8).flat();
        expect([...flat].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
        expect(new Set(flat).size).toBe(flat.length);
    });
});

describe('activeMatchIndex', () => {
    it('prefers the live game', () => {
        expect(activeMatchIndex([
            match('a', 1, 'completed'), match('b', 1, 'in_progress'), match('c', 1, 'scheduled'),
        ])).toBe(1);
    });

    it('falls back to the next unplayed game', () => {
        expect(activeMatchIndex([
            match('a', 1, 'completed'), match('b', 1, 'walkover'), match('c', 1, 'scheduled'),
        ])).toBe(2);
    });

    it('lands on the first game once everything is finished', () => {
        expect(activeMatchIndex([match('a', 1, 'completed'), match('b', 1, 'completed')])).toBe(0);
    });

    it('is safe on an empty list', () => {
        expect(activeMatchIndex([])).toBe(0);
    });
});

describe('groupGlyph', () => {
    it('extracts the trailing letter from backend group names', () => {
        expect(groupGlyph('Group A')).toBe('A');
        expect(groupGlyph('Group 12')).toBe('12');
    });

    it('returns null-safe fallback for long trailing words', () => {
        expect(groupGlyph('קבוצת הצפון')).toBeNull();
    });
});
