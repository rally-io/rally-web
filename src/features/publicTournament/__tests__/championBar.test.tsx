import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ChampionBar } from '../components/ChampionBar';
import type { PublicMatch, PublicTeam } from '../types';

const player = (id: string, first: string, last: string) => ({
    id, first_name: first, last_name: last, skill_level: null, is_guest: null,
});

const team = (first: string, second: string): PublicTeam => ({
    team_name: null,
    player_1: player('p1', first.split(' ')[0], first.split(' ')[1]),
    player_2: player('p2', second.split(' ')[0], second.split(' ')[1]),
    is_lucky_loser: null,
});

const match = (over: Partial<PublicMatch>): PublicMatch => ({
    id: 'final',
    match_label: 'Final',
    round_number: 3,
    team_a: team('Alexander Konstantinov', 'Michael Abramovich'),
    team_b: team('Adi Shani', 'Lian Katz'),
    sets: [],
    winner_team: null,
    next_match_id: null,
    status: 'scheduled',
    court_name: null,
    scheduled_at: null,
    ...over,
});

describe('ChampionBar', () => {
    it('shows the champion pair in full, never truncated', () => {
        render(<ChampionBar match={match({ winner_team: 'team_a', status: 'completed' })} />);
        // The winning pair is the most-read name on the screen — the one place an ellipsis
        // costs the most, since nothing else on the page repeats it.
        const name = screen.getByText('Alexander Konstantinov / Michael Abramovich');
        expect(name.className).not.toContain('truncate');
        expect(name.title).toBe('Alexander Konstantinov / Michael Abramovich');
        expect(name.className).toContain('text-(--pb-highlight)');
    });

    it('names the other side when team B wins', () => {
        render(<ChampionBar match={match({ winner_team: 'team_b', status: 'completed' })} />);
        expect(screen.getByText('Adi Shani / Lian Katz')).toBeInTheDocument();
        expect(screen.queryByText('Alexander Konstantinov / Michael Abramovich')).toBeNull();
    });

    it('holds an em-dash placeholder while the final is still undecided', () => {
        render(<ChampionBar match={match({})} />);
        const placeholder = screen.getByText('—');
        expect(placeholder.className).toContain('text-(--pb-text-faint)');
        // No name yet: the finalists must not read as a result.
        expect(screen.queryByText('Adi Shani / Lian Katz')).toBeNull();
    });

    it('renders nothing without a final match', () => {
        const { container } = render(<ChampionBar match={null} />);
        expect(container).toBeEmptyDOMElement();
    });
});
