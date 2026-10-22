import type { PublicMatch, PublicRound } from './types';

export type BracketSide = 'left' | 'right' | 'center';

/** One column of the TV tree. A `null` slot is a row kept empty so the cards beside it stay level
 *  with the match they feed (a hidden bye, see `buildColumns`). */
export type BracketColumn = { key: string; roundName: string; side: BracketSide; slots: (PublicMatch | null)[] };

/** From this many rounds (a 32-pair draw and up) the TV tree switches to its compact cards: at the
 *  roomy size a 16-match column needs about three of the 695px the canvas has for it. */
export const COMPACT_MIN_ROUNDS = 5;

/**
 * A first-round match the draw generated only to give a seed a bye: one side empty, auto-advanced
 * as a walkover. A real walkover (a pair withdrew from a match that had two pairs) keeps both
 * sides and stays on the board.
 */
export function isGeneratedBye(match: PublicMatch): boolean {
    return match.status === 'walkover' && !match.team_a !== !match.team_b && match.sets.length === 0;
}

/**
 * The first round with its byes taken out, as one slot per next-round match on that side, holding
 * the real match that feeds it (or nothing). Each slot is then level with the match it feeds.
 *
 * Null when the side cannot be drawn that way: a next-round match fed by two real matches (a slot
 * holds one card) or a match whose `next_match_id` is not on this side. The caller then shows the
 * round as it is, byes and all.
 */
function firstRoundSlots(firstHalf: PublicMatch[], nextHalf: PublicMatch[]): (PublicMatch | null)[] | null {
    const slotOf = new Map(nextHalf.map((m, i) => [m.id, i]));
    const slots: (PublicMatch | null)[] = nextHalf.map(() => null);
    for (const m of firstHalf) {
        if (isGeneratedBye(m)) continue;
        const i = m.next_match_id ? slotOf.get(m.next_match_id) : undefined;
        if (i === undefined || slots[i]) return null;
        slots[i] = m;
    }
    return slots;
}

function halves(matches: PublicMatch[]): [PublicMatch[], PublicMatch[]] {
    const cut = Math.ceil(matches.length / 2);
    return [matches.slice(0, cut), matches.slice(cut)];
}

/**
 * The final in the centre, every earlier round split in half: the first half of its matches on
 * the left, the second half on the right, mirrored.
 *
 * A draw that is not a power of two pads the first round with byes — 35 pairs in a 64 draw is 29
 * byes and 3 real matches — and drawing those as cards made the first round the tallest column on
 * the screen while holding almost nothing. They are left out, and the first round's real matches
 * sit level with the match they feed; the pair given the bye already shows in the second round.
 */
export function buildColumns(rounds: PublicRound[]): BracketColumn[] {
    if (rounds.length === 0) return [];
    const finalRound = rounds[rounds.length - 1];
    const earlier = rounds.slice(0, -1);
    const split: [(PublicMatch | null)[], (PublicMatch | null)[]][] = earlier.map(r => halves(r.matches));

    // Only when the round after the first is itself split across the sides; in a two-round draw
    // the first round feeds the final directly and has nothing to sit level with.
    if (earlier.length >= 2 && earlier[0].matches.some(isGeneratedBye)) {
        const [firstLeft, firstRight] = halves(earlier[0].matches);
        const [nextLeft, nextRight] = halves(earlier[1].matches);
        const left = firstRoundSlots(firstLeft, nextLeft);
        const right = firstRoundSlots(firstRight, nextRight);
        if (left && right) split[0] = [left, right];
    }

    const column = (r: PublicRound, i: number, side: 'left' | 'right'): BracketColumn => ({
        key: `${side === 'left' ? 'L' : 'R'}${r.round_number}`,
        roundName: r.round_name,
        side,
        slots: split[i][side === 'left' ? 0 : 1],
    });
    // A round stays on both sides while either side shows a card in it, so the final stays centred.
    const shown = earlier.map((_, i) => split[i].some(half => half.some(Boolean)));
    const left = earlier.map((r, i) => column(r, i, 'left')).filter((_, i) => shown[i]);
    const right = earlier.map((r, i) => column(r, i, 'right')).filter((_, i) => shown[i]).reverse();
    const center: BracketColumn = { key: 'C', roundName: finalRound.round_name, side: 'center', slots: finalRound.matches };
    return [...left, center, ...right].filter(c => c.slots.length > 0);
}

/**
 * How far to shrink a tree of `natural` size so all of it shows in `box`: never enlarged, and 1
 * when either size is unknown (jsdom does no layout and measures everything as 0).
 */
export function fitScale(box: { width: number; height: number }, natural: { width: number; height: number }): number {
    if (!box.width || !box.height || !natural.width || !natural.height) return 1;
    return Math.min(1, box.width / natural.width, box.height / natural.height);
}
