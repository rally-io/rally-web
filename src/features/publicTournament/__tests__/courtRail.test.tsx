import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CourtRail } from '../components/CourtRail';
import type { PublicBracketData, PublicMatch } from '../types';

const player = (id: string, first: string) => ({
    id, first_name: first, last_name: 'P', skill_level: null, is_guest: null,
});

const match = (over: Partial<PublicMatch>): PublicMatch => ({
    id: 'm', match_label: null, round_number: 1,
    team_a: { team_name: null, player_1: player('p1', 'Gal'), player_2: null, is_lucky_loser: null },
    team_b: { team_name: null, player_1: player('p2', 'Adi'), player_2: null, is_lucky_loser: null },
    sets: [], winner_team: null, next_match_id: null,
    status: 'scheduled', court_name: 'Court 1', scheduled_at: '2026-08-11T10:00:00Z',
    ...over,
});

const bracket = (matches: PublicMatch[]): PublicBracketData => ({
    tournament_id: 't', tournament_name: 'T', structure: 'group_then_knockout',
    club_name: null, club_logo_url: null, sponsors: [], videos: [],
    knockout_rounds: [], plate_rounds: [], league_standings: null, third_place_match: null,
    groups: [{ group_name: 'Group A', matches, standings: [] }],
});

describe('CourtRail', () => {
    it('shows a live match with per-set scores, never a joined score string', () => {
        render(<CourtRail bracket={bracket([
            match({ id: 'live', status: 'in_progress', sets: [{ team_a_score: 6, team_b_score: 4, is_tiebreak: null }] }),
        ])} />);
        expect(screen.getByText('Court 1')).toBeInTheDocument();
        expect(screen.getByText('6')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.queryByText('6:4')).toBeNull();
    });

    it('shows the earliest upcoming match when nothing is live on that court', () => {
        render(<CourtRail bracket={bracket([
            match({ id: 'late', scheduled_at: '2026-08-11T14:00:00Z', team_a: { team_name: 'Late', player_1: null, player_2: null, is_lucky_loser: null } }),
            match({ id: 'early', scheduled_at: '2026-08-11T10:00:00Z', team_a: { team_name: 'Early', player_1: null, player_2: null, is_lucky_loser: null } }),
        ])} />);
        expect(screen.getByText('Early')).toBeInTheDocument();
        expect(screen.queryByText('Late')).toBeNull();
    });

    it('renders nothing at all when no match names a court', () => {
        const { container } = render(<CourtRail bracket={bracket([match({ court_name: null })])} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('drops a court whose matches are all finished, rather than a TBD tile', () => {
        render(<CourtRail bracket={bracket([
            match({ id: 'done', status: 'completed', court_name: 'Court 1' }),
            match({ id: 'live', status: 'in_progress', court_name: 'Court 2', sets: [{ team_a_score: 6, team_b_score: 4, is_tiebreak: null }] }),
        ])} />);
        expect(screen.queryByText('Court 1')).toBeNull();
        expect(screen.getByText('Court 2')).toBeInTheDocument();
    });

    it('renders nothing at all when every court has nothing live or next', () => {
        const { container } = render(<CourtRail bracket={bracket([
            match({ id: 'a', status: 'completed', court_name: 'Court 1' }),
            match({ id: 'b', status: 'walkover', court_name: 'Court 2' }),
        ])} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('caps the rail at 6 tiles when there are more candidate courts than that', () => {
        const names = Array.from({ length: 8 }, (_, i) => `Court ${i + 1}`);
        render(<CourtRail bracket={bracket(names.map((court, i) =>
            match({ id: `m${i}`, court_name: court, scheduled_at: `2026-08-11T${10 + i}:00:00Z` }),
        ))} />);
        expect(screen.getAllByText(/^Court \d+$/)).toHaveLength(6);
    });

    it('keeps live courts over next-only ones when trimming beyond 6 candidates', () => {
        const names = Array.from({ length: 8 }, (_, i) => `Court ${i + 1}`);
        render(<CourtRail bracket={bracket(names.map((court, i) =>
            match({
                id: `m${i}`,
                court_name: court,
                scheduled_at: `2026-08-11T${10 + i}:00:00Z`,
                // Courts 7 and 8 sort naturally last — a cap that ignored live status in favour
                // of plain natural-order truncation would drop them, hiding the two live matches.
                ...(i >= 6 ? { status: 'in_progress', sets: [{ team_a_score: 6, team_b_score: 4, is_tiebreak: null }] } : {}),
            }),
        ))} />);
        expect(screen.getAllByText(/^Court \d+$/)).toHaveLength(6);
        expect(screen.getByText('Court 7')).toBeInTheDocument();
        expect(screen.getByText('Court 8')).toBeInTheDocument();
    });

    it('never truncates a team name — the line shrinks instead', () => {
        render(<CourtRail bracket={bracket([
            match({ id: 'live', status: 'in_progress', sets: [{ team_a_score: 6, team_b_score: 4, is_tiebreak: null }] }),
        ])} />);
        // Both sides of the tile, not just the leading one: the second name is the muted line
        // and was a separate truncating span before FitText.
        ['Gal P', 'Adi P'].forEach(name => {
            const line = screen.getByText(name);
            expect(line.className).not.toContain('truncate');
            expect(line.title).toBe(name);
        });
    });

    it('keeps natural court order after capping, so Court 9 still precedes Court 10', () => {
        const names = ['Court 1', 'Court 2', 'Court 3', 'Court 4', 'Court 9', 'Court 10', 'Court 11'];
        render(<CourtRail bracket={bracket(names.map((court, i) =>
            match({ id: `m${i}`, court_name: court, scheduled_at: `2026-08-11T${10 + i}:00:00Z` }),
        ))} />);
        const rendered = screen.getAllByText(/^Court \d+$/).map(el => el.textContent);
        expect(rendered).toEqual(['Court 1', 'Court 2', 'Court 3', 'Court 4', 'Court 9', 'Court 10']);
    });
});
