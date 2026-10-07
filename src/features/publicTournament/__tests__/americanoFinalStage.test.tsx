import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { AmericanoFinalStage } from '../components/AmericanoFinalStage';
import { toLiveBoard } from '../americano';
import type { PublicBracketData } from '../types';
import { americanoBracket, bigEvening } from './fixtures/americanoBoard';

/** A final on `courts` courts after two played rounds; `finalStatus` sets each final game's status. */
function finalBoard(courts: number, finalStatus: (court: number) => string): PublicBracketData {
    return toLiveBoard(americanoBracket(bigEvening({
        rounds: 3, courts, withFinal: true,
        status: (round, court) => (round < 3 ? 'completed' : finalStatus(court)),
    })));
}

function renderFinal(board: PublicBracketData, compact = false): void {
    const final = board.knockout_rounds.filter(r => r.round_number === 3);
    render(<AmericanoFinalStage rounds={final} standings={board.league_standings ?? []} compact={compact} />);
}

/** A court's block: its "Court N · Ranked x–y" label and the card under it. */
const block = (label: string): HTMLElement => screen.getByText(label).parentElement as HTMLElement;

describe('AmericanoFinalStage fits every court, up to 16 (W-f)', () => {
    const labels = (): string[] => screen.getAllByText(/^Court \d+ · Ranked/).map(el => el.textContent ?? '');
    const hero = (): Element | null => document.querySelector('.w-\\[620px\\]');
    const lines = (): number => document.querySelectorAll('[data-game-id]').length;

    it('four courts: the hero and a row of cards, as before', () => {
        renderFinal(finalBoard(4, () => 'scheduled'));
        expect(hero()).toHaveTextContent('Court 1 · Ranked 1–4');
        expect(labels()).toHaveLength(4);
        expect(lines()).toBe(0);
        expect(screen.getByText('Leading the evening')).toBeInTheDocument();
        expect(hero()!.parentElement).toHaveClass('justify-evenly');          // today's even spacing
    });

    it.each([5, 8])('%i courts: the hero, then every other court as a game line, four across', courts => {
        renderFinal(finalBoard(courts, court => (court === 2 ? 'in_progress' : 'scheduled')));
        expect(hero()).toHaveTextContent('Court 1 · Ranked 1–4');
        expect(labels()).toHaveLength(courts);
        expect(lines()).toBe(courts - 1);
        expect(document.querySelector('[data-game-id="g3-2"]')).not.toBeNull();       // the live game
        expect(document.querySelector('[data-game-id]')!.closest('.grid-cols-4')).not.toBeNull();
        expect(screen.getByText('Leading the evening')).toBeInTheDocument();
        expect(hero()!.parentElement).toHaveClass('justify-center');
    });

    it.each([9, 12, 16])('%i courts: no hero, every court a game line in one four-across grid', courts => {
        renderFinal(finalBoard(courts, () => 'scheduled'));
        expect(hero()).toBeNull();
        expect(labels()).toHaveLength(courts);
        expect(labels()[courts - 1]).toBe(`Court ${courts} · Ranked ${4 * courts - 3}–${4 * courts}`);
        expect(lines()).toBe(courts);
        expect(screen.getByText('Leading the evening')).toBeInTheDocument();
        expect(document.querySelector('[data-game-id]')!.closest('.grid-cols-4')).not.toBeNull();
        expect(new Set(Array.from(document.querySelectorAll('[data-game-id]')).map(g => g.closest('.grid-cols-4'))).size).toBe(1);
    });

    it('once every final game is in, the podium takes the leader bar\'s fixed row', () => {
        renderFinal(finalBoard(16, () => 'completed'));
        expect(screen.getByText('Champion of the evening')).toBeInTheDocument();
        expect(screen.queryByText('Leading the evening')).toBeNull();
    });
});

describe('the podium\'s colours are theme tokens (W-i)', () => {
    it('the champion\'s trophy is the highlight; silver and bronze come from the skin', () => {
        renderFinal(finalBoard(4, () => 'completed'));
        const podium = screen.getByText('Champion of the evening').parentElement as HTMLElement;
        // Podium order on screen: 2 · 1 · 3.
        const icons = Array.from(podium.querySelectorAll('svg')).map(svg => svg.getAttribute('class') ?? '');
        expect(icons).toHaveLength(3);
        expect(icons[0]).toContain('lucide-medal');
        expect(icons[0]).toContain('text-(--pb-medal-silver)');
        expect(icons[1]).toContain('lucide-trophy');
        expect(icons[1]).toContain('text-(--pb-highlight)');
        expect(icons[2]).toContain('text-(--pb-medal-bronze)');
        icons.forEach(c => expect(c).not.toContain('#'));
    });
});

describe('AmericanoFinalStage seeds from the seat, not the list index (W-b)', () => {
    it('a 4-court final with court 2 cancelled shows "Court 3 · Ranked 9–12" with badges #9–#12', () => {
        renderFinal(finalBoard(4, court => (court === 2 ? 'cancelled' : 'scheduled')));
        const court3 = block('Court 3 · Ranked 9–12');
        ['#9', '#10', '#11', '#12'].forEach(seed => expect(within(court3).getByText(seed)).toBeInTheDocument());
        expect(block('Court 4 · Ranked 13–16')).toBeInTheDocument();
        expect(screen.queryByText(/Ranked 5–8/)).toBeNull();
    });

    it('the hero is the lowest seat present, under its own label', () => {
        renderFinal(finalBoard(4, court => (court === 1 ? 'cancelled' : 'scheduled')));
        const labels = screen.getAllByText(/^Court \d · Ranked/).map(el => el.textContent);
        expect(labels[0]).toBe('Court 2 · Ranked 5–8');
        expect(screen.queryByText(/Ranked 1–4/)).toBeNull();
        expect(within(block('Court 2 · Ranked 5–8')).getByText('#5')).toBeInTheDocument();
    });

    it('the phone list keys its seeds to the seat too', () => {
        renderFinal(finalBoard(4, court => (court === 2 ? 'cancelled' : 'scheduled')), true);
        expect(within(block('Court 3 · Ranked 9–12')).getByText('#9')).toBeInTheDocument();
    });
});
