import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { GameLine } from '../components/GameLine';
import { MatchCard } from '../components/MatchCard';
import { toLiveBoard } from '../americano';
import type { PublicMatch } from '../types';
import { americanoBracket } from './fixtures/americanoBoard';

/** The rounds as the TV board renders them: through `toLiveBoard`, exactly like AmericanoRoundsBoard gets them. */
const rounds = toLiveBoard(americanoBracket()).knockout_rounds;
const game = (id: string): PublicMatch => {
    const found = rounds.flatMap(r => r.matches).find(m => m.id === id);
    if (!found) throw new Error(`no game ${id} in the fixture`);
    return found;
};

describe('GameLine', () => {
    // Regression guard: GameLine is the TV path for an Americano game (AmericanoRoundsBoard's
    // round cards). A tie can only happen on an Americano game (isTieMatch); this pins
    // `scoreTone`'s tie branch reaching GameLine's score the same way it already reaches
    // MatchCard's (the phone path) — losing it would read a tied game as "both lost" (faint)
    // instead of the regular text colour. It also carries the same Tie pill MatchCard shows.
    it('paints both scores of a tied, completed Americano game in the regular text colour, with a Tie pill', () => {
        render(<GameLine match={game('r1c2')} size="md" />);
        const scores = screen.getAllByText('12');
        expect(scores).toHaveLength(2);
        scores.forEach(score => {
            expect(score).toHaveClass('text-(--pb-text)');
            expect(score).not.toHaveClass('text-(--pb-text-faint)');
            expect(score).not.toHaveClass('text-(--pb-highlight)');
            expect(score).not.toHaveClass('text-(--pb-live)');
        });
        expect(screen.getByText('Tie')).toBeInTheDocument();
    });

    it('keeps the winner/loser score colours on a decided game, and shows no pill', () => {
        render(<GameLine match={game('r1c1')} size="md" />);
        expect(screen.getByText('16')).toHaveClass('text-(--pb-highlight)');
        expect(screen.getByText('10')).toHaveClass('text-(--pb-text-faint)');
        expect(screen.queryByText('Tie')).toBeNull();
    });

    it('reads a level score still on court as live, not a tie: no pill while the game is in progress', () => {
        render(<GameLine match={{ ...game('r1c2'), status: 'in_progress' }} size="md" />);
        screen.getAllByText('12').forEach(score => expect(score).toHaveClass('text-(--pb-live)'));
        expect(screen.queryByText('Tie')).toBeNull();
    });

    // Review fix 3 (Minor 1): GameLine used to draw Tie as its own chip, MatchCard a bare label.
    // Both now render the same TieLabel, and MatchCard's look wins.
    it('renders the identical Tie mark MatchCard shows, not its own chip (review fix 3)', () => {
        const { container: lineContainer } = render(<GameLine match={game('r1c2')} size="md" />);
        const { container: cardContainer } = render(<MatchCard match={game('r1c2')} />);
        const lineTie = lineContainer.querySelector('[data-testid="tie-label"]');
        const cardTie = cardContainer.querySelector('[data-testid="tie-label"]');
        expect(lineTie).not.toBeNull();
        expect(cardTie).not.toBeNull();
        expect(lineTie!.className).toBe(cardTie!.className);
    });
});
