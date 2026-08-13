import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { StandingsTable } from '../components/StandingsTable';
import { GroupsView } from '../components/GroupsView';
import type { PublicGroup, PublicMatch, PublicStanding } from '../types';

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

describe('StandingsTable before the first result', () => {
    const fourPairs = [
        row({ position: 1, team_name: 'Pair One' }),
        row({ position: 2, team_name: 'Pair Two' }),
        row({ position: 3, team_name: 'Pair Three' }),
        row({ position: 4, team_name: 'Pair Four' }),
    ];

    it('shows the full table reading zero, not a stripped-down one', () => {
        // A board that is emptier before the tournament than during it reads as broken, and a
        // table that grows columns the moment a score lands changes shape under the hall. The
        // columns are up from the draw, at 0.
        const { container } = render(<StandingsTable title="Group A" standings={fourPairs} qualifyCount={2} />);

        expect(screen.getByText('Pair One')).toBeInTheDocument();
        expect(screen.getByText('Pair Four')).toBeInTheDocument();
        // Column headings, place numerals, the cutoff line and the numeric cells all present.
        expect(screen.getByText('Games')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText(/advance/i)).toBeInTheDocument();
        expect(container.querySelectorAll('.tabular-nums').length).toBeGreaterThan(0);

        // ...but NOT the qualifying tint. It is the one mark that points at two specific pairs,
        // and pre-start the only thing putting them on top is where the draw fell.
        expect(container.querySelector('.bg-\\(--pb-winner-bg\\)')).toBeNull();
    });

    it('keeps the same columns once results arrive, so nothing moves', () => {
        // The pair of assertions that matters: identical structure before and after, which is
        // what stops the card resizing under a viewer mid-read.
        const before = render(<StandingsTable title="Group A" standings={fourPairs} qualifyCount={2} />);
        const columnsBefore = before.container.querySelectorAll('.tabular-nums').length;
        before.unmount();

        const after = render(<StandingsTable title="Group A" standings={[
            row({ position: 1, team_name: 'Pair One', wins: 1, games_won: 6, games_lost: 2 }),
            row({ position: 2, team_name: 'Pair Two', losses: 1, games_won: 2, games_lost: 6 }),
            row({ position: 3, team_name: 'Pair Three' }),
            row({ position: 4, team_name: 'Pair Four' }),
        ]} qualifyCount={2} />);

        expect(after.container.querySelectorAll('.tabular-nums').length).toBe(columnsBefore);
        expect(after.container.querySelector('.bg-\\(--pb-winner-bg\\)')).not.toBeNull();
    });
});

describe('the phone and the TV show the same thing pre-start', () => {
    const match = (over: Partial<PublicMatch>): PublicMatch => ({
        id: 'm1',
        match_label: null,
        round_number: 1,
        team_a: null,
        team_b: null,
        sets: [],
        winner_team: null,
        next_match_id: null,
        status: 'scheduled',
        court_name: null,
        scheduled_at: null,
        ...over,
    });

    const groupWith = (matches: PublicMatch[]): PublicGroup => ({
        group_name: 'Group A',
        matches,
        standings: [
            row({ position: 1, team_name: 'Pair One' }),
            row({ position: 2, team_name: 'Pair Two' }),
            row({ position: 3, team_name: 'Pair Three' }),
        ],
    });

    // These two surfaces render different components for one group, and drifted apart once
    // already — the phone ranked pairs while the TV showed names alone for the same tournament.
    it('draws the cutoff line on an unplayed group', () => {
        render(<GroupsView groups={[groupWith([match({})])]} view="standings" isBigScreen={false} qualifyCount={2} />);
        expect(screen.getByText(/advance/i)).toBeInTheDocument();
    });

    it('still draws it once a match has a score', () => {
        const played = match({ sets: [{ team_a_score: 6, team_b_score: 1, is_tiebreak: null }] });
        render(<GroupsView groups={[groupWith([played])]} view="standings" isBigScreen={false} qualifyCount={2} />);
        expect(screen.getByText(/advance/i)).toBeInTheDocument();
    });
});
