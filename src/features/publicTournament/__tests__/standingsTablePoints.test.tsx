import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { StandingsTable } from '../components/StandingsTable';
import type { PublicStanding } from '../types';

const person = (name: string) => ({ id: `p-${name}`, first_name: name, last_name: 'L', skill_level: null, is_guest: null });

/** A row as `toLiveBoard` builds it from an Americano standing. */
const row = (over: Partial<PublicStanding> & { position: number; name: string }): PublicStanding => {
    const { name, ...rest } = over;
    return {
        player_name: null, team_name: null, player_1: person(name), player_2: null,
        matches_played: 0, wins: 0, ties: 0, losses: 0,
        sets_won: 0, sets_lost: 0, games_won: 0, games_lost: 0,
        points: 0, points_diff: 0, is_disqualified: false,
        ...rest,
    };
};

/** Every cell of the header strip and of one row's number strip, in DOM order. */
const strip = (cell: HTMLElement): string[] => [...cell.parentElement!.children].map(c => c.textContent ?? '');

describe('StandingsTable in points mode (Americano)', () => {
    it('heads W, T, L, points and diff, and fills them from the row', () => {
        render(<StandingsTable title="Standings" mode="points" standings={[
            row({ position: 1, name: 'Noa', wins: 3, ties: 4, losses: 2, points: 27, points_diff: 5 }),
        ]} />);
        expect(strip(screen.getByText('W'))).toEqual(['W', 'T', 'L', 'Pts', '+/-']);
        expect(strip(screen.getByText('27'))).toEqual(['3', '4', '2', '27', '+5']);
        expect(screen.queryByText('Games')).toBeNull();
    });

    it('keeps W, T and L as the page\'s own flex items, never inside a dir="ltr" box', () => {
        // The CRM's lesson: a dir="ltr" "3–4–2" under an RTL header put wins under L. Separate
        // cells with no direction of their own reverse together with the header. Only the signed
        // diff is pinned ltr, so "+5" never reads "5+".
        render(<div dir="rtl"><StandingsTable title="Standings" mode="points" standings={[
            row({ position: 1, name: 'Noa', wins: 3, ties: 4, losses: 2, points: 27, points_diff: 5 }),
        ]} /></div>);
        ['W', 'T', 'L', '3', '4', '2', '27'].forEach(text => {
            expect(screen.getByText(text).closest('[dir="ltr"]')).toBeNull();
        });
        expect(screen.getByText('+5').getAttribute('dir')).toBe('ltr');
    });

    it('lists rows in the order given — the API ranks by points — and colours the diff', () => {
        const { container } = render(<StandingsTable title="Standings" mode="points" standings={[
            row({ position: 1, name: 'Noa', points: 16, points_diff: 6 }),
            row({ position: 2, name: 'Tom', points: 12, points_diff: 0 }),
            row({ position: 3, name: 'Gal', points: 10, points_diff: -6 }),
        ]} />);
        const names = [...container.querySelectorAll('[title]')].map(el => el.getAttribute('title'));
        expect(names).toEqual(['Noa L', 'Tom L', 'Gal L']);
        expect(screen.getByText('+6').className).toContain('text-(--pb-won)');
        expect(screen.getByText('-6').className).toContain('text-(--pb-lost)');
    });

    it('flags a disqualified player last but keeps their real record', () => {
        render(<StandingsTable title="Standings" mode="points" standings={[
            row({ position: 1, name: 'Noa', wins: 1, points: 16, points_diff: 6 }),
            row({ position: 2, name: 'Eden', wins: 2, ties: 1, losses: 3, points: 41, points_diff: -7, is_disqualified: true }),
        ]} />);
        const eden = screen.getByText('Eden L');
        expect(eden.className).toContain('line-through');
        const edenRow = eden.closest('.flex.items-center.gap-2') as HTMLElement;
        expect(within(edenRow).getByText('Disqualified')).toBeInTheDocument();
        expect(strip(within(edenRow).getByText('41'))).toEqual(['2', '1', '3', '41', '-7']);
        expect(within(edenRow).getAllByText('—')).toHaveLength(1);   // the position only
    });
});

describe('StandingsTable in games mode is unchanged', () => {
    it('has no T or points column, and still voids a disqualified pair', () => {
        render(<StandingsTable title="League Table" standings={[
            row({ position: 1, name: 'Noa', wins: 2, losses: 1, games_won: 12, games_lost: 7, ties: 5, points: 99 }),
            row({ position: 2, name: 'Eden', wins: 1, losses: 1, games_won: 6, games_lost: 6, is_disqualified: true }),
        ]} />);
        expect(strip(screen.getByText('W'))).toEqual(['W', 'L', 'Games', '+/-']);
        expect(screen.queryByText('99')).toBeNull();
        expect(screen.queryByText('5')).toBeNull();
        expect(screen.getByText('+5')).toBeInTheDocument();
        const edenRow = screen.getByText('Eden L').closest('.flex.items-center.gap-2') as HTMLElement;
        expect(within(edenRow).getAllByText('—')).toHaveLength(5);
    });
});
