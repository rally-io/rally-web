import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { StandingsTable } from '../components/StandingsTable';
import type { PublicStanding } from '../types';

const row = (over: Partial<PublicStanding> & { position: number }): PublicStanding => ({
    player_name: null,
    team_name: 'Team',
    player_1: null,
    player_2: null,
    matches_played: 0,
    wins: 0,
    losses: 0,
    sets_won: 0,
    sets_lost: 0,
    games_won: 0,
    games_lost: 0,
    points: 0,
    is_disqualified: false,
    ...over,
});

describe('StandingsTable score columns', () => {
    it('derives +/- from games, not sets', () => {
        render(<StandingsTable title="Group A" standings={[
            // Sets say +8; games say -4. Games must win — the TV board already uses games,
            // and the two surfaces may not disagree about a pair's balance.
            row({ position: 1, team_name: 'Team 1', wins: 2, losses: 1, sets_won: 10, sets_lost: 2, games_won: 5, games_lost: 9 }),
        ]} />);
        expect(screen.getByText('-4')).toBeInTheDocument();
        expect(screen.queryByText('+8')).toBeNull();
    });

    it('shows the games distribution with own games green and opponents red', () => {
        render(<StandingsTable title="Group A" standings={[
            row({ position: 1, team_name: 'Team 1', wins: 2, losses: 0, games_won: 12, games_lost: 7 }),
        ]} />);
        expect(screen.getByText('12').className).toContain('text-(--pb-won)');
        expect(screen.getByText('7').className).toContain('text-(--pb-lost)');
        // Separate elements in an ltr container — never a joined string (mirrors in RTL).
        expect(screen.queryByText('12–7')).toBeNull();
        expect(screen.getByText('12').parentElement?.getAttribute('dir')).toBe('ltr');
    });

    it('keeps every player\'s full name without truncation', () => {
        render(<StandingsTable title="Group A" standings={[
            row({
                position: 1,
                team_name: null,
                player_1: { id: 'p1', first_name: 'Alexander', last_name: 'Konstantinov', skill_level: null, is_guest: null },
                player_2: { id: 'p2', first_name: 'Michael', last_name: 'Abramovich', skill_level: null, is_guest: null },
                wins: 1, losses: 0,
            }),
        ]} />);
        const name = screen.getByText('Alexander Konstantinov');
        expect(name.className).not.toContain('truncate');
        expect(name.title).toBe('Alexander Konstantinov');
        expect(screen.getByText('Michael Abramovich')).toBeInTheDocument();
    });

    it('colors a zero diff with the same muted token the TV board uses', () => {
        render(<StandingsTable title="Group A" standings={[
            row({ position: 1, team_name: 'Level', wins: 1, losses: 1, games_won: 8, games_lost: 8 }),
        ]} />);
        // Pinned to the token, not just "not green/red": this cell and GroupBoardCard's already
        // drifted apart once (faint here, muted there) for the identical state.
        const diffCell = screen.getByText('0');
        expect(diffCell.className).toContain('text-(--pb-text-muted)');
        expect(diffCell.className).not.toContain('text-(--pb-won)');
        expect(diffCell.className).not.toContain('text-(--pb-lost)');
    });

    it('sizes the name separator with the names it separates', () => {
        const { container } = render(<StandingsTable title="Group A" large standings={[
            row({
                position: 1,
                team_name: null,
                player_1: { id: 'p1', first_name: 'Gal', last_name: 'Cohen', skill_level: null, is_guest: null },
                player_2: { id: 'p2', first_name: 'Noa', last_name: 'Levi', skill_level: null, is_guest: null },
                wins: 1, losses: 0,
            }),
        ]} />);
        // FitText sizes each name inline, so the slash between them has no sized ancestor left
        // to inherit from — without a size of its own it renders larger than both names.
        const separator = Array.from(container.querySelectorAll('span')).find(el => el.textContent === '/');
        expect(separator).toBeDefined();
        expect(separator!.className).toContain('text-sm');
    });
});
