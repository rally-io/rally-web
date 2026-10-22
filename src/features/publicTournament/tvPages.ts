import type { PublicGroup } from './types';

/**
 * How the venue TV splits a group stage that does not fit one screen.
 *
 * Every page is a layout already measured on the 1600×900 canvas, so a group count nobody tuned
 * for — twelve, sixteen, nineteen — is just more pages of ones that were: the screen never shrinks
 * a group below what was checked, and no event needs its own patch. One page whenever the groups
 * fit, because a hall should not wait a page to see its group (owner 2026-10-04); past that, the
 * fewest pages, as even as they go, each on screen for one rotation step (`useViewMode`).
 *
 * The capacities are measured in `/preview.html` with every pair given the longest realistic name
 * (`long=all`) and a disqualified pair (the tallest row), as "every row inside its card" on the
 * standings board and "no card reaching into the next lane" on the games screen.
 */

/** Pairs in the largest group: the row count every capacity below is measured against. */
export function largestGroup(groups: PublicGroup[]): number {
    return Math.max(0, ...groups.map(g => g.standings.length));
}

/**
 * Standings cards a page holds. Up to five pairs, nine: 3×3, one line per pair
 * (`compactGroupCards`). Nine groups of six overflow that by 14px, so six pairs is eight, the
 * 4×2 board. Seven or more overflow any two-row grid (four groups of seven at 2×2: 11px over)
 * and go one row of four (`tvGridCols(n, true)`), measured to ten pairs.
 *
 * Not ten to twelve on one board of three rows of four: their names drop to 9–11px, and a
 * disqualified pair's row overflows its card by 20px.
 */
export function boardGroupsPerPage(pairs: number): number {
    if (pairs <= 5) return 9;
    if (pairs === 6) return 8;
    return 4;
}

/**
 * Games lanes a page holds. A lane is as tall as its tallest card, and `LanesView` caps a lane at
 * six cards. Eight lanes get 70px each: up to four pairs, a card with the longest name on both
 * lines is 77px and reaches 7px into the 8px gap below it; at nine lanes, once results put "Final"
 * on the cards, every card overlaps the header of the lane below. Past four pairs a card is 82px,
 * so seven lanes of 82px.
 */
export function lanesPerPage(pairs: number): number {
    return pairs <= 4 ? 8 : 7;
}

/**
 * `count` items in the fewest pages of at most `perPage`, as even as they go — twelve groups at
 * nine a page are six and six, not nine and three. Indices into the original list, so a group
 * keeps its accent and its place in the order on whichever page it lands.
 */
export function splitIntoPages(count: number, perPage: number): number[][] {
    const pageCount = Math.max(1, Math.ceil(count / perPage));
    const base = Math.floor(count / pageCount);
    const longer = count % pageCount;
    const pages: number[][] = [];
    let start = 0;
    for (let p = 0; p < pageCount; p++) {
        const size = base + (p < longer ? 1 : 0);
        pages.push(Array.from({ length: size }, (_, i) => start + i));
        start += size;
    }
    return pages;
}

/** The TV's two group screens: the standings board and the games lanes. */
export type TvGroupScreen = 'board' | 'lanes';

/**
 * The pages one TV screen shows `groups` in. Each screen has its own capacity, so the two can
 * split differently: nine groups are one standings page and two pages of lanes.
 */
export function tvGroupPages(groups: PublicGroup[], screen: TvGroupScreen): number[][] {
    const pairs = largestGroup(groups);
    return splitIntoPages(groups.length, screen === 'board' ? boardGroupsPerPage(pairs) : lanesPerPage(pairs));
}
