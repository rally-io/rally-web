import { describe, expect, it } from 'vitest';
import { render, within } from '@testing-library/react';

import { MatchCard, type MatchCardVariant } from '../components/MatchCard';
import { LaneMatchCard } from '../components/LaneMatchCard';
import { GroupBoardCard } from '../components/GroupBoardCard';
import type { PublicGroup, PublicMatch, PublicPlayer, PublicStanding } from '../types';

const player = (id: string, first: string, last: string): PublicPlayer => ({
    id, first_name: first, last_name: last, skill_level: null, is_guest: null,
});

const match = (over: Partial<PublicMatch>): PublicMatch => ({
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

const standing = (over: Partial<PublicStanding> & { position: number }): PublicStanding => ({
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

const group = (over: Partial<PublicGroup>): PublicGroup => ({
    group_name: 'Group A',
    matches: [],
    standings: [],
    ...over,
});

/** A kick-off time as either card prints it — HH:mm, whatever the runner's timezone. */
const CLOCK = /^\d{1,2}:\d{2}$/;

const played = (id: string) => match({ id, sets: [{ team_a_score: 6, team_b_score: 2, is_tiebreak: null }], status: 'completed', winner_team: 'team_a' });

/** The struck-through treatment sits on an ancestor of the name, not on the name itself. */
function struckThrough(container: HTMLElement, name: string): boolean {
    return within(container).getByText(name).closest('.line-through') !== null;
}

describe('MatchCard — a disqualification-voided fixture', () => {
    const variants: MatchCardVariant[] = ['default', 'node'];

    it.each(variants)('reads as cancelled in the %s variant', variant => {
        const { container } = render(<MatchCard match={match({ status: 'cancelled' })} variant={variant} />);

        // The full wording goes on the card's own label.
        expect(within(container).getByText('Cancelled')).toBeInTheDocument();
        // Not a kick-off time for a game nobody will play.
        expect(within(container).queryByText(CLOCK)).toBeNull();
    });

    it.each(variants)('demotes both pairs in the %s variant', variant => {
        const { container } = render(<MatchCard match={match({ status: 'cancelled' })} variant={variant} />);

        // Both sides: a voided fixture has no winner and no loser.
        expect(struckThrough(container, 'Gal T')).toBe(true);
        expect(struckThrough(container, 'Noa B')).toBe(true);
        expect(struckThrough(container, 'Adi S')).toBe(true);
        expect(struckThrough(container, 'Lian K')).toBe(true);
    });

    it.each(variants)('marks the score column with a fixed-width icon in the %s variant', variant => {
        const { container } = render(<MatchCard match={match({ status: 'cancelled' })} variant={variant} />);

        // One marker per row, still announced to a screen reader. An icon, not the 9-character
        // word: `min-w` on the score column is a floor, not a cap.
        const markers = within(container).getAllByLabelText('Cancelled');
        expect(markers).toHaveLength(2);
        markers.forEach(m => expect(m.getAttribute('width')).toBe('12'));
        // And not the empty-scoreline placeholder in its place.
        expect(within(container).queryByText('—')).toBeNull();
    });
});

describe('LaneMatchCard — a disqualification-voided fixture', () => {
    it('carries its own state, even when it is the next fixture up', () => {
        const { container } = render(<LaneMatchCard match={match({ status: 'cancelled' })} isNext />);

        expect(container.querySelector('[data-pb-state="voided"]')).not.toBeNull();
        expect(container.querySelector('[data-pb-state="next"]')).toBeNull();
    });

    it('shows the cancelled label instead of a time and court', () => {
        const { container } = render(<LaneMatchCard match={match({ status: 'cancelled' })} isNext={false} />);

        expect(within(container).getByText('Cancelled')).toBeInTheDocument();
        expect(within(container).queryByText(/Court 1/)).toBeNull();
        expect(within(container).queryByText(CLOCK)).toBeNull();
    });

    it('demotes both pairs', () => {
        const { container } = render(<LaneMatchCard match={match({ status: 'cancelled' })} isNext={false} />);

        expect(within(container).getByText('Gal T / Noa B').className).toContain('line-through');
        expect(within(container).getByText('Adi S / Lian K').className).toContain('line-through');
    });
});

describe('GroupBoardCard — the matches counter', () => {
    it('leaves voided fixtures out of the denominator', () => {
        const g = group({
            matches: [
                played('m1'), played('m2'), played('m3'), played('m4'),
                match({ id: 'm5', status: 'cancelled' }),
                match({ id: 'm6', status: 'cancelled' }),
            ],
            standings: [
                standing({ position: 1, team_name: 'Alpha', wins: 2, losses: 0 }),
                standing({ position: 2, team_name: 'Beta', wins: 0, losses: 2 }),
            ],
        });
        const { container } = render(<GroupBoardCard group={g} />);

        // 4 played of the 4 that will ever be played — not 4/6 for the rest of the evening.
        expect(within(container).getByText('4/4')).toBeInTheDocument();
        expect(within(container).queryByText('4/6')).toBeNull();
    });

    it('still counts every fixture when none was voided', () => {
        const g = group({
            matches: [played('m1'), played('m2'), played('m3'), played('m4'), match({ id: 'm5' }), match({ id: 'm6' })],
            standings: [standing({ position: 1, team_name: 'Alpha', wins: 2, losses: 0 })],
        });
        const { container } = render(<GroupBoardCard group={g} />);

        expect(within(container).getByText('4/6')).toBeInTheDocument();
    });
});

describe('every other status renders exactly as before (regression)', () => {
    it('MatchCard: a scheduled fixture still shows its kick-off time and an empty scoreline', () => {
        const { container } = render(<MatchCard match={match({})} />);

        expect(within(container).getByText(CLOCK)).toBeInTheDocument();
        expect(within(container).queryByText('Cancelled')).toBeNull();
        expect(container.querySelector('.line-through')).toBeNull();
        expect(within(container).getAllByText('—')).toHaveLength(2);
    });

    it('MatchCard: a live fixture still shows the live dot and its label', () => {
        const { container } = render(<MatchCard match={match({ status: 'in_progress', sets: [{ team_a_score: 4, team_b_score: 3, is_tiebreak: null }] })} />);

        expect(container.querySelector('.pb-live-dot')).not.toBeNull();
        expect(within(container).getByText('Live')).toBeInTheDocument();
        expect(within(container).queryByText('Cancelled')).toBeNull();
        expect(container.querySelector('.line-through')).toBeNull();
    });

    it('MatchCard: a completed fixture still shows its tick and its scores', () => {
        const { container } = render(<MatchCard match={played('m1')} />);

        expect(within(container).getByText('✓')).toBeInTheDocument();
        expect(within(container).getByText('6')).toBeInTheDocument();
        expect(within(container).getByText('2')).toBeInTheDocument();
        expect(within(container).queryByText('Cancelled')).toBeNull();
        expect(container.querySelector('.line-through')).toBeNull();
    });

    it('MatchCard: a walkover still shows its abbreviated W/O text', () => {
        const { container } = render(<MatchCard match={match({ status: 'walkover', winner_team: 'team_a' })} />);

        expect(within(container).getByText('W/O')).toBeInTheDocument();
        expect(within(container).queryByLabelText('Cancelled')).toBeNull();
        expect(container.querySelector('.line-through')).toBeNull();
    });

    it.each([
        ['scheduled', { status: 'scheduled' } as Partial<PublicMatch>, 'scheduled'],
        ['live', { status: 'in_progress' } as Partial<PublicMatch>, 'live'],
        ['completed', { status: 'completed', winner_team: 'team_a' } as Partial<PublicMatch>, 'done'],
        ['walkover', { status: 'walkover', winner_team: 'team_a' } as Partial<PublicMatch>, 'done'],
    ])('LaneMatchCard: a %s fixture still reads as %s', (_label, over, state) => {
        const { container } = render(<LaneMatchCard match={match(over)} isNext={false} />);

        expect(container.querySelector(`[data-pb-state="${state}"]`)).not.toBeNull();
        expect(within(container).queryByText('Cancelled')).toBeNull();
        expect(container.querySelector('.line-through')).toBeNull();
    });

    it('LaneMatchCard: a live fixture still shows the live dot and its court', () => {
        const { container } = render(<LaneMatchCard match={match({ status: 'in_progress' })} isNext={false} />);

        expect(container.querySelector('.pb-live-dot')).not.toBeNull();
        expect(within(container).getByText(/Court 1/)).toBeInTheDocument();
    });

    it('LaneMatchCard: a scheduled fixture still shows time and court, and next is still called out', () => {
        const { container } = render(<LaneMatchCard match={match({})} isNext />);

        expect(container.querySelector('[data-pb-state="next"]')).not.toBeNull();
        expect(within(container).getByText(/Court 1/)).toBeInTheDocument();
    });
});
