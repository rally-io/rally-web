import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { RoundStepper } from '../components/RoundStepper';
import type { PublicRound } from '../types';

/**
 * The stepper is a horizontally scrolling strip: 5 rounds already overflow a 390 px phone, and an
 * 8-round Americano evening puts rounds 5–8 off-screen. The round being shown must be scrolled into
 * the strip — sideways only, inside the strip, never the page (the stepper sits below the table, so
 * scrolling the page would yank every phone down on load).
 *
 * jsdom does no layout, so the strip and the active pill get their boxes from a mock: a DIV read is
 * the strip, a BUTTON read is the active pill (the only button whose box the stepper reads).
 */
const rounds: PublicRound[] = [1, 2, 3, 4, 5].map(n => ({ round_number: n, round_name: `Round ${n}`, matches: [] }));

type Box = { left: number; right: number };
const STRIP: Box = { left: 16, right: 374 };
let pill: Box = { left: 100, right: 190 };

const rect = ({ left, right }: Box): DOMRect => ({
    left, right, x: left, width: right - left, top: 0, bottom: 29, y: 0, height: 29, toJSON: () => ({}),
}) as DOMRect;

const originalScrollBy = HTMLElement.prototype.scrollBy;
let scrollBy: ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        return rect(this.tagName === 'BUTTON' ? pill : STRIP);
    });
    scrollBy = vi.fn();
    // Installed before render: the effect runs on mount. jsdom has no element scrollBy of its own.
    HTMLElement.prototype.scrollBy = scrollBy as unknown as typeof HTMLElement.prototype.scrollBy;
});

afterEach(() => {
    vi.restoreAllMocks();
    if (originalScrollBy) HTMLElement.prototype.scrollBy = originalScrollBy;
    else delete (HTMLElement.prototype as Partial<HTMLElement>).scrollBy;
    pill = { left: 100, right: 190 };
});

describe('RoundStepper keeps the round on screen inside the strip', () => {
    it('scrolls the strip back by the overhang when the pill sits past its left edge', () => {
        pill = { left: -69, right: 5 };   // measured on a 5-round league at 390 px, Hebrew
        render(<RoundStepper rounds={rounds} activeIndex={4} onSelect={vi.fn()} />);
        expect(scrollBy).toHaveBeenCalledTimes(1);
        expect(scrollBy).toHaveBeenCalledWith({ left: -85 });
    });

    it('scrolls the strip on by the overhang when the pill sits past its right edge', () => {
        pill = { left: 380, right: 460 };
        render(<RoundStepper rounds={rounds} activeIndex={4} onSelect={vi.fn()} />);
        expect(scrollBy).toHaveBeenCalledTimes(1);
        expect(scrollBy).toHaveBeenCalledWith({ left: 86 });
    });

    it('leaves the strip alone when the pill is already inside it', () => {
        render(<RoundStepper rounds={rounds} activeIndex={1} onSelect={vi.fn()} />);
        expect(scrollBy).not.toHaveBeenCalled();
    });

    it('follows a change of round', () => {
        const { rerender } = render(<RoundStepper rounds={rounds} activeIndex={1} onSelect={vi.fn()} />);
        expect(scrollBy).not.toHaveBeenCalled();
        pill = { left: -69, right: 5 };
        rerender(<RoundStepper rounds={rounds} activeIndex={4} onSelect={vi.fn()} />);
        expect(scrollBy).toHaveBeenCalledTimes(1);
        expect(scrollBy).toHaveBeenCalledWith({ left: -85 });
    });

    it('never scrolls the page', () => {
        const pageScroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
        const intoView = vi.fn();
        HTMLElement.prototype.scrollIntoView = intoView;
        try {
            pill = { left: -69, right: 5 };
            render(<RoundStepper rounds={rounds} activeIndex={4} onSelect={vi.fn()} />);
            expect(pageScroll).not.toHaveBeenCalled();
            expect(intoView).not.toHaveBeenCalled();
        } finally {
            delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
        }
    });
});
