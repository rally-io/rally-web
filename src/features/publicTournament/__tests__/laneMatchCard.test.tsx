import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { LaneMatchCard } from '../components/LaneMatchCard';
import type { PublicMatch } from '../types';

const player = (id: string, first: string, last: string) => ({
    id, first_name: first, last_name: last, skill_level: null, is_guest: null,
});

const base = (over: Partial<PublicMatch>): PublicMatch => ({
    id: 'm1',
    match_label: null,
    round_number: 1,
    team_a: { team_name: null, player_1: player('p1', 'Gal', 'T'), player_2: player('p2', 'Noa', 'B'), is_lucky_loser: null },
    team_b: { team_name: null, player_1: player('p3', 'Adi', 'S'), player_2: player('p4', 'Lian', 'K'), is_lucky_loser: null },
    sets: [],
    winner_team: null,
    next_match_id: null,
    status: 'scheduled',
    court_name: 'Court 1',
    scheduled_at: '2026-08-11T10:00:00Z',
    ...over,
});

describe('LaneMatchCard', () => {
    it('shows time and court for a scheduled match', () => {
        render(<LaneMatchCard match={base({})} isNext={false} />);
        expect(screen.getByText(/Court 1/)).toBeInTheDocument();
        expect(screen.getByText('Gal T / Noa B')).toBeInTheDocument();
    });

    it('marks the next match up', () => {
        const { container } = render(<LaneMatchCard match={base({})} isNext />);
        expect(container.querySelector('[data-pb-state="next"]')).not.toBeNull();
    });

    it('shows a live match with its court and per-set scores', () => {
        const { container } = render(
            <LaneMatchCard
                match={base({ status: 'in_progress', sets: [{ team_a_score: 6, team_b_score: 4, is_tiebreak: null }] })}
                isNext={false}
            />,
        );
        expect(container.querySelector('[data-pb-state="live"]')).not.toBeNull();
        expect(screen.getByText('6')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        // The colon is a bidi number-joiner: a joined "6:4" would mirror in RTL.
        expect(screen.queryByText('6:4')).toBeNull();
    });

    it('shows a finished match as final with the winner emphasised', () => {
        const { container } = render(
            <LaneMatchCard
                match={base({
                    status: 'completed',
                    winner_team: 'team_a',
                    sets: [{ team_a_score: 6, team_b_score: 3, is_tiebreak: null }],
                })}
                isNext={false}
            />,
        );
        expect(container.querySelector('[data-pb-state="done"]')).not.toBeNull();
        expect(screen.getByText('Final')).toBeInTheDocument();
        expect(screen.getByText('Gal T / Noa B').className).toContain('font-extrabold');
    });

    it('renders a placeholder for a match with no teams yet', () => {
        render(<LaneMatchCard match={base({ team_a: null, team_b: null })} isNext={false} />);
        expect(screen.getAllByText('TBD')).toHaveLength(2);
    });

    it('never truncates a team name — the line shrinks instead', () => {
        render(<LaneMatchCard match={base({})} isNext={false} />);
        const name = screen.getByText('Gal T / Noa B');
        expect(name.className).not.toContain('truncate');
        expect(name.title).toBe('Gal T / Noa B');
    });
});
