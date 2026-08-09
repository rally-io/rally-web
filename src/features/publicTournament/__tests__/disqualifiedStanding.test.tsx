import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PublicGroupSchema, type PublicStanding } from '../types';
import { StandingsTable } from '../components/StandingsTable';

/**
 * A disqualified pair stays in the group table so a group that loses a team is
 * still legible, but its record was voided — every stat must render as a dash
 * rather than a number that contradicts the rows above it.
 *
 * The schema half of this matters more than it looks. `standings` is parsed
 * with `z.array(...).catch([])`, so ONE element failing validation silently
 * blanks the entire group's table — no error, no console warning, the board
 * just goes empty. That is why `position` is a required number on the wire even
 * for a disqualified row, and why `is_disqualified` carries `.catch(false)`.
 */

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

describe('disqualified pair in the public standings', () => {
    it('survives schema validation without blanking the group', () => {
        const parsed = PublicGroupSchema.parse({
            group_name: 'Group A',
            matches: [],
            standings: [
                { ...row({ position: 1, team_name: 'Team 1' }) },
                { ...row({ position: 2, team_name: 'Team 4' }) },
                { ...row({ position: 3, team_name: 'Team 8' }), is_disqualified: true },
            ],
        });
        expect(parsed.standings).toHaveLength(3);
        expect(parsed.standings[2].is_disqualified).toBe(true);
    });

    it('blanks nothing when is_disqualified is absent (older API)', () => {
        const parsed = PublicGroupSchema.parse({
            group_name: 'Group A',
            matches: [],
            standings: [{ position: 1, team_name: 'Team 1', wins: 0, losses: 0 }],
        });
        expect(parsed.standings).toHaveLength(1);
        expect(parsed.standings[0].is_disqualified).toBe(false);
    });

    it('would blank the whole table if position were ever null', () => {
        // Locks in why the API sends a real int: this is the failure mode, and
        // .catch([]) makes it silent.
        const parsed = PublicGroupSchema.parse({
            group_name: 'Group A',
            matches: [],
            standings: [
                { position: 1, team_name: 'Team 1', wins: 0, losses: 0 },
                { position: null, team_name: 'Team 8', wins: 0, losses: 0 },
            ],
        });
        expect(parsed.standings).toHaveLength(0);
    });

    it('renders dashes and a reason instead of a rank and stats', () => {
        render(
            <StandingsTable
                title="Group A"
                qualifyCount={2}
                standings={[
                    row({ position: 1, team_name: 'Team 1' }),
                    row({ position: 2, team_name: 'Team 4' }),
                    { ...row({ position: 3, team_name: 'Team 8' }), is_disqualified: true },
                ]}
            />,
        );
        expect(screen.getByText('Team 8')).toBeInTheDocument();
        expect(screen.getByText('Disqualified')).toBeInTheDocument();
        // rank + wins + losses + diff, all dashed for that one row
        expect(screen.getAllByText('—')).toHaveLength(4);
    });

    it('never marks a disqualified row as advancing', () => {
        // The row is numbered last, so in a group this small its position still
        // falls inside qualifyCount — the guard has to be explicit.
        const { container } = render(
            <StandingsTable
                title="Group A"
                qualifyCount={2}
                standings={[
                    row({ position: 1, team_name: 'Team 1' }),
                    { ...row({ position: 2, team_name: 'Team 8' }), is_disqualified: true },
                ]}
            />,
        );
        const highlighted = container.querySelectorAll('.bg-\\(--pb-winner-bg\\)');
        expect(highlighted).toHaveLength(1);
    });
});
