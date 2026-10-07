import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { AmericanoRoundsBoard } from '../components/AmericanoRoundsBoard';
import { toLiveBoard } from '../americano';
import type { PublicRound } from '../types';
import { americanoBracket, bigEvening } from './fixtures/americanoBoard';

/** The rounds as the page hands them to the board: parsed, then through `toLiveBoard`. */
function rounds(count: number, courts: number, status: (round: number, court: number) => string): PublicRound[] {
    return toLiveBoard(americanoBracket(bigEvening({ rounds: count, courts, status }))).knockout_rounds;
}

/** Round number → its card's state, for the cards on screen. */
function cardStates(container: HTMLElement): Record<string, string> {
    return Object.fromEntries(Array.from(container.querySelectorAll('[data-card-state]')).map(card => [
        card.querySelector('header p')?.textContent ?? '',
        card.getAttribute('data-card-state') ?? '',
    ]));
}

/** The cards on screen, each with the ids of the games it shows. */
function cards(container: HTMLElement): { round: string; games: string[]; body: HTMLElement }[] {
    return Array.from(container.querySelectorAll('[data-card-state]')).map(card => ({
        round: card.querySelector('header p')?.textContent ?? '',
        games: Array.from(card.querySelectorAll('[data-game-id]')).map(g => g.getAttribute('data-game-id') ?? ''),
        body: card.querySelector('[data-game-id]')!.parentElement as HTMLElement,
    }));
}

describe('AmericanoRoundsBoard shows every game, up to 16 courts (W-f)', () => {
    // Round 6 live: the window centres on it.
    const midEvening = (round: number): string => (round <= 5 ? 'completed' : round === 6 ? 'in_progress' : 'scheduled');

    it('four courts: eight rounds in the group grid, as before', () => {
        const { container } = render(<AmericanoRoundsBoard rounds={rounds(8, 4, midEvening)} />);
        expect(cards(container)).toHaveLength(8);
        expect((container.firstElementChild as HTMLElement).className).toContain('grid-cols-4');
    });

    it.each([5, 8])('%i courts: four rounds in one row, every game in each, the live round among them', courts => {
        const { container } = render(<AmericanoRoundsBoard rounds={rounds(8, courts, midEvening)} />);
        const onScreen = cards(container);
        expect(onScreen.map(c => c.round)).toEqual(['Round 5', 'Round 6', 'Round 7', 'Round 8']);
        onScreen.forEach(c => expect(c.games).toHaveLength(courts));
        expect(onScreen[1].games).toContain(`g6-${courts}`);
        expect((container.firstElementChild as HTMLElement).className).toContain('grid-cols-4');
        expect(onScreen[0].body.className).toContain('flex-col');
    });

    it.each([9, 12, 16])('%i courts: two rounds in one row, each card\'s games in two columns', courts => {
        const { container } = render(<AmericanoRoundsBoard rounds={rounds(8, courts, midEvening)} />);
        const onScreen = cards(container);
        expect(onScreen.map(c => c.round)).toEqual(['Round 6', 'Round 7']);
        onScreen.forEach(c => expect(c.games).toHaveLength(courts));
        expect(onScreen[0].games).toContain(`g6-${courts}`);
        expect((container.firstElementChild as HTMLElement).className).toContain('grid-cols-2');
        expect(onScreen[0].body.className).toContain('grid-cols-2');
    });
});

describe('AmericanoRoundsBoard calls one round next (W-a)', () => {
    it('between rounds — round 5 done, round 6 not started: only round 6', () => {
        const { container } = render(<AmericanoRoundsBoard rounds={rounds(8, 4, r => (r <= 5 ? 'completed' : 'scheduled'))} />);
        const states = cardStates(container);
        expect(Object.values(states).filter(s => s === 'next')).toHaveLength(1);
        expect(states['Round 6']).toBe('next');
        expect(states['Round 7']).toBe('upcoming');
    });

    it('at the start of the evening: only round 1', () => {
        const { container } = render(<AmericanoRoundsBoard rounds={rounds(8, 4, () => 'scheduled')} />);
        const states = cardStates(container);
        expect(Object.values(states).filter(s => s === 'next')).toHaveLength(1);
        expect(states['Round 1']).toBe('next');
        expect(states['Round 2']).toBe('upcoming');
    });

    it('mid-round — round 6 live: round 6 burns and only round 7 is next', () => {
        const { container } = render(<AmericanoRoundsBoard rounds={rounds(8, 4, r => (r <= 5 ? 'completed' : r === 6 ? 'in_progress' : 'scheduled'))} />);
        const states = cardStates(container);
        expect(states['Round 6']).toBe('live');
        expect(Object.values(states).filter(s => s === 'next')).toHaveLength(1);
        expect(states['Round 7']).toBe('next');
        expect(states['Round 5']).toBe('done');
    });

    it('windowed board, several rounds live at once: next stays on screen with the live rounds before it (review fix 1+2)', () => {
        // 5 courts: widest > 4, so the board windows to 4 cards instead of showing all 10 rounds.
        // Rounds 5-7 are live together, so `next` (round 8, the first not-done round after the
        // LAST live one) sits past where the first live round would centre the window. The window
        // must still show it — and, since 3 live rounds + next is exactly 4, all of them: 5-8.
        const { container } = render(
            <AmericanoRoundsBoard rounds={rounds(10, 5, r => (r <= 4 ? 'completed' : r <= 7 ? 'in_progress' : 'scheduled'))} />,
        );
        const states = cardStates(container);
        expect(Object.keys(states)).toHaveLength(4);
        expect(Object.values(states).filter(s => s === 'next')).toHaveLength(1);
        expect(states['Round 5']).toBe('live');
        expect(states['Round 6']).toBe('live');
        expect(states['Round 7']).toBe('live');
        expect(states['Round 8']).toBe('next');
    });

    it('12 courts, a 2-wide window: round 6 never falls off while it and round 7 are both live (review fix 1)', () => {
        // The reviewer's repro: with rounds 1-5 done, 6 and 7 live and 8 upcoming, the old window
        // pulled towards round 8 ("next") and dropped round 6 — a LIVE round — off screen. The
        // fix anchors the window on the first live round instead, so both live rounds stay and
        // "next" (round 8) is the one that drops.
        const { container } = render(
            <AmericanoRoundsBoard rounds={rounds(8, 12, r => (r <= 5 ? 'completed' : r <= 7 ? 'in_progress' : 'scheduled'))} />,
        );
        const states = cardStates(container);
        expect(Object.keys(states)).toEqual(['Round 6', 'Round 7']);
        expect(states['Round 6']).toBe('live');
        expect(states['Round 7']).toBe('live');
    });

    it('4-round window, three live rounds and nothing next: rounds 5-8 stay on screen, all three live ones included (review fix 1)', () => {
        // 6 courts -> the 'several' tier (max 4 rounds on screen). Rounds 6, 7 and 8 are all live
        // and there is no round after them, so `next` is -1 and the board falls back to
        // `visibleRoundWindow` (unchanged by this fix) anchored on the last live round. This pins
        // that fallback still lands on 5-8 with every live round included — four courts would show
        // all 8 rounds unwindowed (tier 'few', max 8) and wouldn't exercise the clamp at all.
        const { container } = render(
            <AmericanoRoundsBoard rounds={rounds(8, 6, r => (r <= 5 ? 'completed' : 'in_progress'))} />,
        );
        const states = cardStates(container);
        expect(Object.keys(states)).toEqual(['Round 5', 'Round 6', 'Round 7', 'Round 8']);
        expect(states['Round 6']).toBe('live');
        expect(states['Round 7']).toBe('live');
        expect(states['Round 8']).toBe('live');
    });
});
