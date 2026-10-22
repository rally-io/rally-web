import { describe, expect, it } from 'vitest';

import { boardGroupsPerPage, lanesPerPage, largestGroup, splitIntoPages, tvGroupPages } from '../tvPages';
import type { PublicGroup, PublicStanding } from '../types';

function row(position: number): PublicStanding {
    return {
        position, is_disqualified: false, player_name: null, team_name: `Pair ${position}`,
        player_1: null, player_2: null, matches_played: 0, wins: 0, losses: 0,
        sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0, points: null,
    };
}

/** `count` groups of `pairs` pairs: all the page plan reads is how many and how big. */
function drawn(count: number, pairs: number): PublicGroup[] {
    return Array.from({ length: count }, (_, i) => ({
        group_name: `Group ${i + 1}`,
        matches: [],
        standings: Array.from({ length: pairs }, (_, p) => row(p + 1)),
    }));
}

const sizes = (pages: number[][]): number[] => pages.map(p => p.length);

/**
 * jsdom does no layout, so none of this can see a card overflow. It pins the split the
 * measurements in ../tvPages.ts produced, and the property the whole module exists for: any
 * group count lands on pages no bigger than a layout someone measured.
 */
describe('splitIntoPages', () => {
    it('keeps everything on one page when it fits', () => {
        expect(splitIntoPages(9, 9)).toEqual([[0, 1, 2, 3, 4, 5, 6, 7, 8]]);
        expect(splitIntoPages(1, 9)).toEqual([[0]]);
    });

    it('splits evenly rather than filling the first page', () => {
        // Nine and three would leave the second page a near-empty screen.
        expect(sizes(splitIntoPages(12, 9))).toEqual([6, 6]);
        expect(sizes(splitIntoPages(17, 9))).toEqual([9, 8]);
        expect(sizes(splitIntoPages(19, 9))).toEqual([7, 6, 6]);
        expect(sizes(splitIntoPages(9, 8))).toEqual([5, 4]);
    });

    it('returns one empty page for no groups, so a caller can always index page 0', () => {
        expect(splitIntoPages(0, 9)).toEqual([[]]);
    });

    it('holds for every count: fewest pages, none over the cap, sizes within one, every index once in order', () => {
        for (const perPage of [4, 7, 8, 9]) {
            for (let n = 1; n <= 40; n++) {
                const pages = splitIntoPages(n, perPage);
                expect(pages).toHaveLength(Math.ceil(n / perPage));
                const s = sizes(pages);
                expect(Math.max(...s)).toBeLessThanOrEqual(perPage);
                expect(Math.max(...s) - Math.min(...s)).toBeLessThanOrEqual(1);
                expect(pages.flat()).toEqual(Array.from({ length: n }, (_, i) => i));
            }
        }
    });
});

describe('page capacities', () => {
    it('holds nine standings cards up to five pairs, eight at six, four from seven', () => {
        for (const pairs of [1, 2, 3, 4, 5]) expect(boardGroupsPerPage(pairs)).toBe(9);
        expect(boardGroupsPerPage(6)).toBe(8);
        for (const pairs of [7, 8, 10]) expect(boardGroupsPerPage(pairs)).toBe(4);
    });

    it('holds eight lanes up to four pairs and seven past that', () => {
        for (const pairs of [2, 3, 4]) expect(lanesPerPage(pairs)).toBe(8);
        for (const pairs of [5, 6, 8]) expect(lanesPerPage(pairs)).toBe(7);
    });

    it('sizes by the largest group, the one that runs out of room first', () => {
        const mixed = [...drawn(3, 4), ...drawn(1, 6)];
        expect(largestGroup(mixed)).toBe(6);
        expect(largestGroup([])).toBe(0);
    });
});

describe('tvGroupPages', () => {
    it('keeps nine groups of four on one standings page and gives the games two', () => {
        expect(sizes(tvGroupPages(drawn(9, 4), 'board'))).toEqual([9]);
        expect(sizes(tvGroupPages(drawn(9, 4), 'lanes'))).toEqual([5, 4]);
    });

    it('turns twelve groups of four into two pages on both screens', () => {
        expect(sizes(tvGroupPages(drawn(12, 4), 'board'))).toEqual([6, 6]);
        expect(sizes(tvGroupPages(drawn(12, 4), 'lanes'))).toEqual([6, 6]);
    });

    it('leaves eight groups of four alone on both screens', () => {
        expect(tvGroupPages(drawn(8, 4), 'board')).toHaveLength(1);
        expect(tvGroupPages(drawn(8, 4), 'lanes')).toHaveLength(1);
    });

    it('splits nine groups of six, which overflow the 3×3 board', () => {
        expect(sizes(tvGroupPages(drawn(9, 6), 'board'))).toEqual([5, 4]);
    });
});
