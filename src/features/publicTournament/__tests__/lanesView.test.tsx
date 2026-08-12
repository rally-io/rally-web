import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { LanesView } from '../components/LanesView';
import type { PublicGroup, PublicMatch, PublicTeam } from '../types';

const team = (name: string): PublicTeam => ({
    team_name: name,
    player_1: null,
    player_2: null,
    is_lucky_loser: null,
});

function match(id: string, round: number | null, status: string, teamA: string, teamB: string): PublicMatch {
    return {
        id,
        match_label: null,
        round_number: round,
        team_a: team(teamA),
        team_b: team(teamB),
        sets: [],
        winner_team: null,
        next_match_id: null,
        status,
        court_name: null,
        scheduled_at: null,
    };
}

function group(name: string, matches: PublicMatch[]): PublicGroup {
    return { group_name: name, matches, standings: [] };
}

const ACCENTS = ['pb-ga-0', 'pb-ga-1'];

/** Counts rendered LaneMatchCard roots — every card sets `data-pb-state` on its own root div. */
function cardCount(container: HTMLElement): number {
    return container.querySelectorAll('[data-pb-state]').length;
}

describe('LanesView', () => {
    it('renders three labelled round columns and all six match cards for a normal 3-round group', () => {
        // Team names are longer than 2 characters so their label text can never collide with the
        // 2-letter chip initials PairChip derives from the same team_name.
        const g = group('Group A', [
            match('m1', 1, 'scheduled', 'Rovers', 'United'),
            match('m2', 1, 'scheduled', 'Albion', 'Athletic'),
            match('m3', 2, 'scheduled', 'Wanderers', 'City'),
            match('m4', 2, 'scheduled', 'County', 'Town'),
            match('m5', 3, 'scheduled', 'Rangers', 'Hotspur'),
            match('m6', 3, 'scheduled', 'Villa', 'Forest'),
        ]);
        const { container } = render(<LanesView groups={[g]} accents={ACCENTS} />);

        expect(screen.getByText('Round 1')).toBeInTheDocument();
        expect(screen.getByText('Round 2')).toBeInTheDocument();
        expect(screen.getByText('Round 3')).toBeInTheDocument();
        expect(cardCount(container)).toBe(6);
    });

    it('renders the round-0 match (null round_number mixed with real ones) and never labels it "Round 0"', () => {
        const g = group('Group B', [
            match('m1', 1, 'scheduled', 'Xray', 'Yankee'),
            match('m2', 2, 'scheduled', 'Zulu', 'Alpha'),
            // groupMatchesByRound parks this in bucket 0 because it sits among real round numbers.
            match('m3', null, 'scheduled', 'Bravo', 'Charlie'),
        ]);
        const { container } = render(<LanesView groups={[g]} accents={ACCENTS} />);

        // The match itself must still be visible — this is the "don't drop it" half of the check.
        expect(screen.getByText('Bravo')).toBeInTheDocument();
        expect(screen.getByText('Charlie')).toBeInTheDocument();
        expect(cardCount(container)).toBe(3);
        // ...and it must never be presented as a numbered round — the "don't mislabel it" half.
        // A regression that re-includes bucket 0 in the labelled axis would add a text node
        // reading exactly "Round 0" somewhere in the document; a regression that instead drops
        // the match would fail the assertions above. Neither passes both.
        // No word-boundary anchor here: header text nodes for adjacent columns are concatenated
        // with no separator in body.textContent (e.g. "Round 0Round 1"), so a trailing `\b` would
        // never fire between two word characters and would silently defeat this check.
        expect(document.body.textContent).not.toMatch(/Round 0/);
    });

    it('renders a legacy all-null-rounds group with no round axis at all', () => {
        const g = group('Group C', [
            match('m1', null, 'scheduled', 'Papa', 'Quebec'),
            match('m2', null, 'scheduled', 'Romeo', 'Sierra'),
        ]);
        const { container } = render(<LanesView groups={[g]} accents={ACCENTS} />);

        // hasRealRounds is false (fewer than 2 distinct real round numbers), so the whole axis
        // header is skipped — no "Round N" label of any kind should exist.
        expect(screen.queryByText(/^Round \d/)).toBeNull();
        expect(screen.getByText('Papa')).toBeInTheDocument();
        expect(screen.getByText('Romeo')).toBeInTheDocument();
        expect(cardCount(container)).toBe(2);
    });

    it('centres the active-round window on a group other than the first when the first has finished', () => {
        // Group A (listed first) is entirely finished through round 6 — if the active round were
        // taken from group[0] alone (the pre-correction bug), it would resolve to round 6 and the
        // 4-column window would show rounds 3-6, pushing round 1 out of view.
        const groupA = group('Group A', [
            match('a1', 1, 'completed', 'A1', 'A2'),
            match('a2', 2, 'completed', 'A1', 'A2'),
            match('a3', 3, 'completed', 'A1', 'A2'),
            match('a4', 4, 'completed', 'A1', 'A2'),
            match('a5', 5, 'completed', 'A1', 'A2'),
            match('a6', 6, 'completed', 'A1', 'A2'),
        ]);
        // Group B is still on round 1, live right now.
        const groupB = group('Group B', [
            match('b1', 1, 'in_progress', 'B1', 'B2'),
            match('b2', 2, 'scheduled', 'B1', 'B2'),
            match('b3', 3, 'scheduled', 'B1', 'B2'),
            match('b4', 4, 'scheduled', 'B1', 'B2'),
            match('b5', 5, 'scheduled', 'B1', 'B2'),
            match('b6', 6, 'scheduled', 'B1', 'B2'),
        ]);
        render(<LanesView groups={[groupA, groupB]} accents={ACCENTS} />);

        // Correct behaviour: the active round is derived from the union of both groups, so round
        // 1 (still live in group B) stays inside the visible window and is labelled "In progress".
        expect(screen.getByText('Round 1')).toBeInTheDocument();
        expect(screen.getByText('In progress')).toBeInTheDocument();
    });

    it('never lets a null-round live match make round 1 read as in progress', () => {
        // groupMatchesByRound (the source of truth) parks a null round_number in bucket 0, not 1
        // — round 1's own match (m1) is completed, so the axis must say "Finished". A live match
        // that actually belongs to bucket 0 must not leak its "In progress" state onto round 1.
        const g = group('Group D', [
            match('m1', 1, 'completed', 'Alpha', 'Bravo'),
            match('m2', 2, 'scheduled', 'Charlie', 'Delta'),
            match('m3', null, 'in_progress', 'Echo', 'Foxtrot'),
        ]);
        render(<LanesView groups={[g]} accents={ACCENTS} />);

        expect(screen.getByText('Round 1')).toBeInTheDocument();
        expect(screen.getByText('Finished')).toBeInTheDocument();
        expect(screen.queryByText('In progress')).toBeNull();
    });

    it('renders a placeholder instead of an empty row when a lane has no matches inside the shared window', () => {
        // A deep 6-round group whose active round is 5 (rounds 1-4 finished, 5 still open)
        // centres the shared 4-column window on rounds 3-6 — reproducing the reviewer's probe
        // ("Rounds 3-6 of 6"). Alongside it, a flat legacy group (no real round numbers) has none
        // of its matches in that window at all.
        const deepGroup = group('Group A', [
            match('a1', 1, 'completed', 'A1', 'A2'),
            match('a2', 2, 'completed', 'A1', 'A2'),
            match('a3', 3, 'completed', 'A1', 'A2'),
            match('a4', 4, 'completed', 'A1', 'A2'),
            match('a5', 5, 'scheduled', 'A1', 'A2'),
            match('a6', 6, 'scheduled', 'A1', 'A2'),
        ]);
        const flatLegacyGroup = group('Group B', [
            match('b1', null, 'completed', 'Bravo', 'Charlie'),
            match('b2', null, 'completed', 'Delta', 'Echo'),
        ]);
        const { container } = render(<LanesView groups={[deepGroup, flatLegacyGroup]} accents={ACCENTS} />);

        expect(screen.getByText('Rounds 3–6 of 6')).toBeInTheDocument();
        // Group A still shows its four in-window cards (rounds 3-6); Group B contributes none.
        expect(cardCount(container)).toBe(4);
        // Group B's row must read as "no games shown here", not as a blank row an unattended
        // viewer would read as "this group has no games at all".
        expect(screen.getByText('No matches in this round window')).toBeInTheDocument();
    });
});
