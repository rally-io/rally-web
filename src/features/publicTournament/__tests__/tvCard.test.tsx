import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TvCard } from '../components/TvCard';
import { RankNumeral } from '../components/RankNumeral';
import { AmericanoRoundsBoard } from '../components/AmericanoRoundsBoard';
import { AmericanoLeaderboardTV } from '../components/AmericanoLeaderboardTV';
import { toLiveBoard } from '../americano';
import { americanoBracket } from './fixtures/americanoBoard';

const FRAME = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-(--pb-border) border-t-[3px] bg-(--pb-card) [border-top-color:var(--pb-ga,var(--pb-highlight))]';

describe('TvCard', () => {
    it('without a state: the group card frame, content-sized, its top edge in the accent', () => {
        const { container } = render(<TvCard accentClass="pb-ga-2" header={<p>Title</p>}><p>Body</p></TvCard>);
        const card = container.firstElementChild as HTMLElement;
        expect(card.className).toBe(`${FRAME} pb-ga-2`);
        expect(card.className).not.toContain('h-full');
        expect(card.hasAttribute('data-card-state')).toBe(false);
        // No state, no tone: a group card never reads `--pb-tone`, so it must never be set.
        expect(card.style.getPropertyValue('--pb-tone')).toBe('');
        expect(card.querySelector('header')!.className).toBe('flex shrink-0 items-center gap-2.5 border-b border-(--pb-border) bg-(--pb-card-header) px-4 py-1.5');
    });

    it.each([
        // live is the one state that replaces FRAME's neutral border colour outright — the
        // other three only ever touch the top edge, so the neutral `border-(--pb-border)`
        // must still be there for them (a genuinely discriminating check, not one FRAME would
        // satisfy on its own regardless of STATE_CLASS).
        ['live', '[border-top-color:var(--pb-live)]', 'border-(--pb-live)/60', false, 'var(--pb-live)'],
        ['next', '[border-top-color:var(--pb-accent)]', null, true, 'var(--pb-accent)'],
        ['done', '[border-top-color:var(--pb-highlight)]', 'opacity-80', true, 'var(--pb-highlight)'],
        ['upcoming', '[border-top-color:var(--pb-border)]', null, true, 'var(--pb-text-faint)'],
    ] as const)('state %s carries its own frame', (state, top, extra, keepsNeutralBorder, tone) => {
        const { container } = render(<TvCard state={state} header={null}>x</TvCard>);
        const card = container.firstElementChild as HTMLElement;
        expect(card.getAttribute('data-card-state')).toBe(state);
        expect(card.className).toContain(top);
        if (extra) expect(card.className).toContain(extra);
        // Discriminating per state, not trivially true from FRAME alone: live drops the
        // neutral border colour (replaced by its own tinted one); the other three keep it.
        expect(card.className.includes('border-(--pb-border)')).toBe(keepsNeutralBorder);
        // twMerge keeps one top colour: the state's replaces the frame's accent.
        expect(card.className).not.toContain('[border-top-color:var(--pb-ga,var(--pb-highlight))]');
        // The state's own colour, exposed as `--pb-tone` for a header-slot consumer (the round
        // glyph, the status pill) to read instead of keeping its own state-to-colour ternary.
        expect(card.style.getPropertyValue('--pb-tone')).toBe(tone);
    });
});

describe('RankNumeral', () => {
    it('is the group card numeral: body face, text-2xl, leading-none after the size', () => {
        const { container } = render(<RankNumeral widthClass="w-6" dense={false} highlight>1</RankNumeral>);
        const el = container.firstElementChild as HTMLElement;
        expect(el.className).toBe('w-6 shrink-0 text-center text-2xl font-black leading-none text-(--pb-highlight)');
        expect(el.getAttribute('aria-hidden')).toBe('true');
    });

    it('goes to text-xl when dense and keeps leading-none', () => {
        const { container } = render(<RankNumeral widthClass="w-9" dense highlight={false}>12</RankNumeral>);
        expect((container.firstElementChild as HTMLElement).className).toBe('w-9 shrink-0 text-center font-black text-xl leading-none text-(--pb-text-faint)');
    });
});

describe('the Americano TV cards share the frame', () => {
    const board = toLiveBoard(americanoBracket());

    it('a finished round reads "Finished", with no tick, and recedes like a finished lane card', () => {
        const { container } = render(<AmericanoRoundsBoard rounds={board.knockout_rounds} />);
        expect(screen.getAllByText('Finished')).toHaveLength(2);       // rounds 1 and 2
        expect(screen.queryByText(/✓/)).toBeNull();
        container.querySelectorAll('[data-card-state="done"]').forEach(card => expect(card.className).toContain('opacity-80'));
    });

    it('the table: body-face numerals, the group card\'s column labels, and a leader row with no ring', () => {
        const { container } = render(<AmericanoLeaderboardTV standings={board.league_standings ?? []} finalBands={false} />);
        expect(container.querySelector('.pb-display')).toBeNull();
        const leader = screen.getByText('Noa L').closest('.rounded-xl') as HTMLElement;
        expect(leader.className).toContain('bg-(--pb-winner-bg)');
        expect(leader.className).not.toContain('ring-');
        expect((leader.firstElementChild as HTMLElement).className).toContain('text-2xl');
        const labels = screen.getByText('Pts').parentElement as HTMLElement;
        expect(labels.className).toBe('flex shrink-0 items-center gap-1.5 px-6 pt-1 text-[10px] font-black uppercase tracking-wider text-(--pb-text-faint)');
    });
});
