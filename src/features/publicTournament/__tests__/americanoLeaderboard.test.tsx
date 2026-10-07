import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { AmericanoLeaderboardTV } from '../components/AmericanoLeaderboardTV';
import type { PublicStanding } from '../types';

/**
 * A table of P1…Pn in order, each row's projected final court from `courts` (rally-api A6 sends
 * null for anyone who would sit the final out). `disqualified` rows are flagged; the API sorts
 * them last.
 */
function table(courts: (number | null)[], disqualified: number[] = []): PublicStanding[] {
    return courts.map((court, i) => ({
        position: i + 1,
        is_disqualified: disqualified.includes(i + 1),
        player_name: null,
        team_name: null,
        player_1: { id: `p${i + 1}`, first_name: `P${i + 1}`, last_name: 'L', skill_level: null, is_guest: null },
        player_2: null,
        matches_played: 3,
        wins: 1, ties: 0, losses: 2,
        sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0,
        points: 40 - i, points_diff: 0,
        projected_final_court: court,
    }));
}

const fours = (courts: number): number[] => Array.from({ length: courts * 4 }, (_, i) => Math.floor(i / 4) + 1);
const bands = (): string[] => screen.queryAllByText(/^Final · court \d+$/).map(el => el.textContent ?? '');
const row = (name: string): HTMLElement => screen.getByText(name).closest('.rounded-xl') as HTMLElement;
const marked = (name: string): boolean => within(row(name)).queryByText('Not in the final') !== null;

describe('AmericanoLeaderboardTV final bands follow the API\'s seating (W-c)', () => {
    it('16 players on 3 courts: three bands, places 13–16 marked', () => {
        render(<AmericanoLeaderboardTV standings={table([...fours(3), null, null, null, null])} finalBands />);
        expect(bands()).toEqual(['Final · court 1', 'Final · court 2', 'Final · court 3']);
        expect(screen.getAllByText('Not in the final')).toHaveLength(4);
        ['P13 L', 'P14 L', 'P15 L', 'P16 L'].forEach(name => expect(marked(name)).toBe(true));
        expect(marked('P12 L')).toBe(false);
    });

    it('18 players on 4 courts: four bands, places 17–18 marked', () => {
        render(<AmericanoLeaderboardTV standings={table([...fours(4), null, null])} finalBands />);
        expect(bands()).toEqual(['Final · court 1', 'Final · court 2', 'Final · court 3', 'Final · court 4']);
        expect(screen.getAllByText('Not in the final')).toHaveLength(2);
        expect(marked('P17 L')).toBe(true);
        expect(marked('P18 L')).toBe(true);
    });

    it('16 on 4 courts with one disqualified: the API seats three courts; the disqualified row keeps only its own badge', () => {
        render(<AmericanoLeaderboardTV standings={table([...fours(3), null, null, null, null], [16])} finalBands />);
        expect(bands()).toEqual(['Final · court 1', 'Final · court 2', 'Final · court 3']);
        ['P13 L', 'P14 L', 'P15 L'].forEach(name => expect(marked(name)).toBe(true));
        expect(marked('P16 L')).toBe(false);
        expect(within(row('P16 L')).getByText('Disqualified')).toBeInTheDocument();
    });

    it('a court the API skips is not invented, and a paused player mid-table is marked in place', () => {
        // P3 paused: court 1 is P1, P2, P4, P5.
        render(<AmericanoLeaderboardTV standings={table([1, 1, null, 1, 1, 2, 2, 2, 2])} finalBands />);
        expect(bands()).toEqual(['Final · court 1', 'Final · court 2']);
        expect(marked('P3 L')).toBe(true);
    });

    it('no bands and no markers once the final is drawn, or from an API that sends no courts', () => {
        const { unmount } = render(<AmericanoLeaderboardTV standings={table(fours(2))} finalBands={false} />);
        expect(bands()).toEqual([]);
        unmount();
        render(<AmericanoLeaderboardTV standings={table(Array(8).fill(null))} finalBands />);
        expect(bands()).toEqual([]);
        expect(screen.queryByText('Not in the final')).toBeNull();
    });

    it('a 0-game row sits beside projected rows without a marker (controller ruling, finding I-1)', () => {
        // P1–P4 are seated on court 1. P5 has no court and no games yet — before its first game
        // is scored it cannot be told apart from "not drawn yet", so it stays unmarked. P6–P8 have
        // no court but DO have games, so they are genuinely left out and get marked.
        const standings = table([1, 1, 1, 1, null, null, null, null]);
        standings[4] = { ...standings[4], matches_played: 0 };
        render(<AmericanoLeaderboardTV standings={standings} finalBands />);
        expect(bands()).toEqual(['Final · court 1']);
        expect(marked('P5 L')).toBe(false);
        ['P6 L', 'P7 L', 'P8 L'].forEach(name => expect(marked(name)).toBe(true));
        expect(screen.getAllByText('Not in the final')).toHaveLength(3);
    });

    it('the "not in the final" and "disqualified" badges share one class string, unchanged from today (review fix 4)', () => {
        render(<AmericanoLeaderboardTV standings={table([...fours(3), null, null, null, null], [16])} finalBands />);
        const notInFinal = screen.getAllByText('Not in the final')[0];
        const disqualified = screen.getByText('Disqualified');
        const todaysClass = 'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-(--pb-text-faint) ring-1 ring-(--pb-border)';
        expect(notInFinal.className).toBe(todaysClass);
        expect(disqualified.className).toBe(todaysClass);
    });
});
