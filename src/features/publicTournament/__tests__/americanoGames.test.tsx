import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MatchCard } from '../components/MatchCard';
import { KnockoutMobile } from '../components/KnockoutMobile';
import { isTieMatch } from '../utils';
import { toLiveBoard } from '../americano';
import type { PublicMatch, PublicRound } from '../types';
import { americanoBracket } from './fixtures/americanoBoard';

/** The rounds as the page hands them to KnockoutMobile: through `toLiveBoard`, cancelled game gone. */
const rounds = toLiveBoard(americanoBracket()).knockout_rounds;
const game = (id: string): PublicMatch => {
    const found = rounds.flatMap(r => r.matches).find(m => m.id === id);
    if (!found) throw new Error(`no game ${id} in the fixture`);
    return found;
};

/** A regular knockout match: two pairs, sets, a winner. */
const regular = (over: Partial<PublicMatch>): PublicMatch => ({
    id: 'k1', match_label: 'Match #1', round_number: 101,
    team_a: { team_name: null, player_1: { id: 'a1', first_name: 'Avi', last_name: 'K', skill_level: null, is_guest: null }, player_2: null, is_lucky_loser: null },
    team_b: { team_name: null, player_1: { id: 'b1', first_name: 'Ben', last_name: 'K', skill_level: null, is_guest: null }, player_2: null, is_lucky_loser: null },
    sets: [{ team_a_score: 6, team_b_score: 4, is_tiebreak: null }],
    winner_team: 'team_a', next_match_id: null, status: 'completed', court_name: 'Court 1', scheduled_at: null,
    ...over,
});

describe('isTieMatch', () => {
    it('is a finished game with level points and no winner', () => {
        expect(isTieMatch(game('r1c2'))).toBe(true);
    });

    it('is not a win, a walkover, an unplayed game, or a level score still on court', () => {
        expect(isTieMatch(game('r1c1'))).toBe(false);
        expect(isTieMatch(game('r2c1'))).toBe(false);
        expect(isTieMatch(game('r3c1'))).toBe(false);
        expect(isTieMatch({ ...game('r1c2'), status: 'live' })).toBe(false);
    });

    it('never fires on a regular match, even a malformed one with no winner', () => {
        expect(isTieMatch(regular({}))).toBe(false);
        expect(isTieMatch(regular({ winner_team: null }))).toBe(false);   // 6–4, no winner: bad data, not a tie
        expect(isTieMatch(regular({ winner_team: null, sets: [] }))).toBe(false);
    });
});

describe('MatchCard with an Americano game', () => {
    it('names all four players, two per side, and shows one points score per side', () => {
        render(<MatchCard match={game('r1c1')} />);
        ['Noa L', 'Ido L', 'Dan L', 'Gal L'].forEach(name => expect(screen.getByText(name)).toBeInTheDocument());
        expect(screen.getByText('16')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('✓')).toBeInTheDocument();
        expect(screen.queryByText('Tie')).toBeNull();
    });

    it('labels a tie instead of ticking it', () => {
        render(<MatchCard match={game('r1c2')} />);
        expect(screen.getByText('Tie')).toBeInTheDocument();
        expect(screen.queryByText('✓')).toBeNull();
        expect(screen.getAllByText('12')).toHaveLength(2);
    });

    it('renders the tie mark through the shared TieLabel (review fix 3)', () => {
        render(<MatchCard match={game('r1c2')} />);
        expect(screen.getByTestId('tie-label')).toHaveTextContent('Tie');
    });

    it('shows a walkover the way a regular one is shown: W/O on the side that was there', () => {
        render(<MatchCard match={game('r2c1')} />);
        expect(screen.getAllByText('W/O')).toHaveLength(1);
        expect(screen.getByText('✓')).toBeInTheDocument();
        expect(screen.queryByText('Tie')).toBeNull();
    });

    it('leaves a regular match as it was', () => {
        render(<MatchCard match={regular({})} />);
        expect(screen.getByText('✓')).toBeInTheDocument();
        expect(screen.queryByText('Tie')).toBeNull();
    });

    // From across a hall, the faint loser colour on both sides reads as "both lost".
    it('paints both scores of a tie in the regular text colour — neither the winner\'s nor the loser\'s', () => {
        render(<MatchCard match={game('r1c2')} />);
        const cells = screen.getAllByText('12').map(score => score.parentElement);
        expect(cells).toHaveLength(2);
        cells.forEach(cell => {
            expect(cell).toHaveClass('text-(--pb-text)');
            expect(cell).not.toHaveClass('text-(--pb-text-faint)');
            expect(cell).not.toHaveClass('text-(--pb-highlight)');
        });
    });

    it('keeps the winner and loser colours on a decided game, Americano or regular', () => {
        const { unmount } = render(<MatchCard match={game('r1c1')} />);
        expect(screen.getByText('16').parentElement).toHaveClass('text-(--pb-highlight)');
        expect(screen.getByText('10').parentElement).toHaveClass('text-(--pb-text-faint)');
        unmount();
        render(<MatchCard match={regular({})} />);
        expect(screen.getByText('6').parentElement).toHaveClass('text-(--pb-highlight)');
        expect(screen.getByText('4').parentElement).toHaveClass('text-(--pb-text-faint)');
    });

    // Regression guard: `tone === 'live' ? 'neutral' : tone` in TeamRow. The card's own frame
    // (border, the "Live" badge) is what marks a live match — the score itself must stay in the
    // same faint colour it has before and after the game, never the live tint GameLine/LaneMatchCard
    // use. Delete that fallback and this fails: both scores would pick up `text-(--pb-live)`.
    it('does not colour a live regular match\'s score as live — the card\'s own frame marks it live', () => {
        render(<MatchCard match={regular({ status: 'in_progress', winner_team: null })} />);
        const a = screen.getByText('6').parentElement;
        const b = screen.getByText('4').parentElement;
        [a, b].forEach(cell => {
            expect(cell).not.toHaveClass('text-(--pb-live)');
            expect(cell).toHaveClass('text-(--pb-text-faint)');
        });
    });
});

describe('KnockoutMobile round note', () => {
    const note = (round: { round_number: number }): string | null => (round.round_number === 2 ? 'Resting: Dan L' : null);

    it('shows the note of the round on screen, and follows the stepper', async () => {
        render(<KnockoutMobile rounds={rounds} dir="ltr" roundNote={note} />);
        // Round 3 has an unplayed game, so it is the round on screen; its note is null.
        expect(screen.queryByTestId('round-note')).toBeNull();
        await userEvent.click(screen.getByRole('button', { name: /Round 2/ }));
        expect(screen.getByTestId('round-note')).toHaveTextContent('Resting: Dan L');
    });

    it('draws no note line at all when the caller passes none', () => {
        render(<KnockoutMobile rounds={rounds} dir="ltr" />);
        expect(screen.queryByTestId('round-note')).toBeNull();
    });
});

describe('KnockoutMobile follows the evening', () => {
    /**
     * The fixture's rounds as a fresh poll delivers them — new objects every time — with some games
     * moved on. Round 2's walkover is reset to an unplayed game so that round 1 finishing makes
     * round 2, not round 3, the round being played.
     */
    const poll = (over: Record<string, Partial<PublicMatch>>): PublicRound[] => rounds.map(r => ({
        ...r,
        matches: r.matches.map(m => ({ ...m, ...(m.id === 'r2c1' ? { status: 'scheduled', winner_team: null } : {}), ...over[m.id] })),
    }));
    const round1Playing = () => poll({ r1c1: { status: 'live' } });
    const round2Playing = (score = 0) => poll({ r2c1: { status: 'live', sets: [{ team_a_score: score, team_b_score: 0, is_tiebreak: null }] } });
    const round3Playing = () => poll({ r2c1: { status: 'completed', winner_team: 'team_a', sets: [{ team_a_score: 16, team_b_score: 9, is_tiebreak: null }] } });

    // Card headers read "Match #N · Court N": round 1 is #1 and #2, round 2 is #3, round 3 is #5 and #6.
    const onScreen = (): string[] => screen.queryAllByText(/^Match #\d+/).map(el => el.textContent?.split(' · ')[0] ?? '');

    it('moves to the next round when the round being played finishes (the TV left open all evening)', () => {
        const { rerender } = render(<KnockoutMobile rounds={round1Playing()} dir="ltr" />);
        expect(onScreen()).toEqual(['Match #1', 'Match #2']);
        rerender(<KnockoutMobile rounds={round2Playing()} dir="ltr" />);
        expect(onScreen()).toEqual(['Match #3']);
    });

    it('leaves a viewer on the round they picked until the next round starts', async () => {
        const { rerender } = render(<KnockoutMobile rounds={round2Playing()} dir="ltr" />);
        expect(onScreen()).toEqual(['Match #3']);
        await userEvent.click(screen.getByRole('button', { name: /Round 1/ }));
        expect(onScreen()).toEqual(['Match #1', 'Match #2']);

        // A poll mid-round: new objects, a score moved, the same round still being played.
        rerender(<KnockoutMobile rounds={round2Playing(5)} dir="ltr" />);
        expect(onScreen()).toEqual(['Match #1', 'Match #2']);

        // Round 2 finishes, round 3 starts: everyone is taken to it.
        rerender(<KnockoutMobile rounds={round3Playing()} dir="ltr" />);
        expect(onScreen()).toEqual(['Match #5', 'Match #6']);
    });
});
